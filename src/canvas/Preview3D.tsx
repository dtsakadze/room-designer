import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { drawerParts } from '../lib/drawer'
import { bandsOf, grainOf } from '../lib/edges'
import { roomAxisOf } from '../lib/grain'
import { footprint, pieceSolids, wallDepthStart } from '../lib/geometry'
import { type RoomBox, WALL_FRAMES, hasSideWalls, wallOf } from '../lib/room'
import { selectedIdOf, useDesignStore } from '../store/useDesignStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useClashes } from '../ui/useClashes'
import type { BoardKey, Dimension, Edge, Piece, Room, Thickness } from '../types'
import { CLASH, type DesignColors, SELECTED, boardOf, faceColor } from './colors'

const BACKGROUND = '#f4f6f9'
const EDGE = '#6f6450'
const ROOM_LINE = '#8c9bad'

/**
 * A 3D look at the unit, in mm, with the same axes as the design: x right, y
 * up from the floor, z out of the wall towards the viewer. It's for looking
 * only; editing stays in the flat views. Loaded on demand, so three.js only
 * downloads once someone opens it.
 */
export default function Preview3D() {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    parts: THREE.Group
    walls: THREE.Group
    frame: () => void
    /** Asks for a new picture on the next frame. */
    invalidate: () => void
  } | null>(null)

  const pieces = useDesignStore((s) => s.pieces)
  const showDoors = useSettingsStore((s) => s.showDoors)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  const selectedId = useDesignStore(selectedIdOf)
  const boardColors = useDesignStore((s) => s.boardColors)
  const edgeColors = useDesignStore((s) => s.edgeColors)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const clashes = useClashes()

  // Scene, camera, renderer and controls: set up once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BACKGROUND)
    scene.add(new THREE.HemisphereLight('#ffffff', '#b9b2a4', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 1.4)
    sun.position.set(2000, 4000, 3000)
    scene.add(sun)

    // A 10 m floor grid in 100 mm squares, like the flat views' grid.
    const floor = new THREE.GridHelper(10000, 100, '#c4cedb', '#dde3ec')
    scene.add(floor)

    const parts = new THREE.Group()
    scene.add(parts)
    const walls = new THREE.Group()
    scene.add(walls)

    const camera = new THREE.PerspectiveCamera(35, 1, 10, 200000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    // Stay above the floor: looking up from under it isn't useful.
    controls.maxPolarAngle = Math.PI / 2 - 0.02

    /** Frames the unit (or the whole room) from the front-right and a little above. */
    const frame = () => {
      const { pieces, thickness, room } = useDesignStore.getState()
      const bounds = sceneBounds(pieces, thickness, room)
      const box = bounds
        ? { x: [bounds.min[0], bounds.max[0]], y: [bounds.min[1], bounds.max[1]] }
        : { x: [-600, 600], y: [0, 2000] }
      const z = bounds ? (bounds.min[2] + bounds.max[2]) / 2 : 300
      const center = new THREE.Vector3((box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, z)
      const depth = bounds ? bounds.max[2] - bounds.min[2] : 0
      const size = Math.max(box.x[1] - box.x[0], box.y[1] - box.y[0], depth, 600)
      const distance = size * 2.2
      const azimuth = THREE.MathUtils.degToRad(35)
      const elevation = THREE.MathUtils.degToRad(20)
      camera.position.set(
        center.x + distance * Math.cos(elevation) * Math.sin(azimuth),
        center.y + distance * Math.sin(elevation),
        center.z + distance * Math.cos(elevation) * Math.cos(azimuth),
      )
      controls.target.copy(center)
      controls.update()
      invalidate()
    }

    // Drawn only when something changed (the camera, the parts, the size),
    // not 60 times a second while nobody touches it, which drains batteries.
    let dirty = true
    const invalidate = () => {
      dirty = true
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
      invalidate()
    }
    // Every camera move, whether from the loop's damping or the controls' own
    // pointer and wheel handlers, which move the camera themselves.
    controls.addEventListener('change', invalidate)
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    frame()

    let raf = 0
    const loop = () => {
      // Keeps the glide after letting go going; a move marks the picture dirty.
      controls.update()
      if (dirty) {
        renderer.render(scene, camera)
        dirty = false
      }
      raf = requestAnimationFrame(loop)
    }
    loop()

    sceneRef.current = { scene, parts, walls, frame, invalidate }
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      disposeChildren(parts)
      disposeChildren(walls)
      floor.geometry.dispose()
      floor.material.dispose()
      // dispose() alone leaves the WebGL context alive until garbage
      // collection, and browsers allow only about 16: switching to 3D and
      // back again and again would make them drop old ones with a warning.
      renderer.forceContextLoss()
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [])

  // Rebuild the parts whenever the design or selection changes.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    disposeChildren(current.parts)
    const zStart = wallDepthStart(pieces, thickness)
    for (const piece of pieces) {
      if (!showDoors && piece.kind === 'door') continue
      const tint = piece.id === selectedId ? SELECTED : clashes.has(piece.id) ? CLASH : null
      const colors = { boardColors, edgeColors }
      // A drawer as its boards, so you can see into it past a see-through door;
      // each is cut from its own board, with its own banding.
      const boards: { board: BoardKey | null; bands: Edge[]; grain: Dimension | null }[] =
        piece.kind === 'drawer'
          ? drawerParts(piece, thickness)
          : [{ board: boardOf(piece.kind), bands: piece.kind === 'rod' ? [] : bandsOf(piece), grain: piece.pane ? null : grainOf(piece) }]
      pieceSolids(piece, zStart(piece), thickness, room).forEach((box, index) => {
        const { board, bands, grain } = boards[index] ?? boards[0]
        // Wood grain on the boards marked as having one, along the way each part's grain runs.
        const grainAxis = board && grain && grainedBoards.includes(board) ? roomAxisOf(grain, wallOf(piece)) : null
        current.parts.add(buildPiece(piece, box, tint, finishOf(piece, board, bands, colors, grainAxis)))
      })
    }
    current.invalidate()
  }, [pieces, thickness, room, selectedId, clashes, showDoors, boardColors, edgeColors, grainedBoards])

  // The room's outline on the floor, once there's more than one wall.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    disposeChildren(current.walls)
    if (hasSideWalls(room)) current.walls.add(buildRoomOutline(room))
    current.invalidate()
  }, [room])

  return (
    <div className="preview-3d" ref={hostRef}>
      <div className="canvas-tools canvas-tools-left">
        <button type="button" className="ghost-button" onClick={() => sceneRef.current?.frame()}>
          Reset view
        </button>
      </div>
    </div>
  )
}

/**
 * The room axes along the two sides of each face of a `BoxGeometry` (its
 * material groups: +x, -x, +y, -y, +z, -z), as texture u then v.
 */
const FACE_AXES = [
  [2, 1],
  [2, 1],
  [0, 2],
  [0, 2],
  [0, 1],
  [0, 1],
] as const

/** How many mm one tile of the grain texture covers. */
const GRAIN_TILE = 500
const grainCanvases: Partial<Record<'across' | 'up', HTMLCanvasElement>> = {}

/**
 * Wood grain for a face, as faint dark lines on white (so the part's colour
 * still shows) running `across` its first side or `up` its second, repeated to
 * suit the face's size in mm. The canvas is drawn once and shared.
 */
function woodTexture(direction: 'across' | 'up', width: number, height: number) {
  let canvas = grainCanvases[direction]
  if (!canvas) {
    const size = 256
    canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size, size)
    // A fixed spread of lines, so every board has the same grain and it never flickers.
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let line = 0; line < 70; line++) {
      const at = random() * size
      context.strokeStyle = `rgba(90, 60, 20, ${0.05 + random() * 0.16})`
      context.lineWidth = 0.6 + random() * 1.8
      context.beginPath()
      if (direction === 'across') {
        context.moveTo(0, at)
        context.lineTo(size, at)
      } else {
        context.moveTo(at, 0)
        context.lineTo(at, size)
      }
      context.stroke()
    }
    grainCanvases[direction] = canvas
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(Math.max(width / GRAIN_TILE, 0.05), Math.max(height / GRAIN_TILE, 0.05))
  return texture
}

/**
 * How a solid is coloured: its face colour, and the faces of its box that are
 * banded edges with their banding colour (only when the board has one).
 */
type Finish = { face: string; edge: string | null; bandedFaces: number[]; grainAxis: number | null }

function finishOf(
  piece: Piece,
  board: BoardKey | null,
  bands: Edge[],
  colors: DesignColors,
  grainAxis: number | null,
): Finish {
  const face = faceColor(piece, colors, board)
  const edge = (board && colors.edgeColors[board]) || null
  if (!edge || bands.length === 0) return { face, edge: null, bandedFaces: [], grainAxis }
  const faces = boxFaces(piece)
  return { face, edge, bandedFaces: bands.map((band) => faces[band]), grainAxis }
}

/**
 * Which face of a `BoxGeometry` (its material groups: +x, -x, +y, -y, +z, -z)
 * each edge of a part faces in the room: its right edge faces along its wall,
 * its front edge out from it.
 */
function boxFaces(piece: Piece): Record<Edge, number> {
  const { along, out } = WALL_FRAMES[wallOf(piece)]
  // A direction on the floor plan is along the room's x or z.
  const face = ([x, z]: [number, number]) => (x !== 0 ? (x > 0 ? 0 : 1) : z > 0 ? 4 : 5)
  const opposite = (index: number) => index ^ 1
  const right = face(along)
  const front = face(out)
  return { right, left: opposite(right), top: 2, bottom: 3, front, back: opposite(front) }
}

/**
 * One piece as a solid with outlined edges; a rod as a cylinder along x.
 * `tint` (selection blue or clash red) is mixed in rather than painted over,
 * so the part still reads as wood.
 */
function buildPiece(piece: Piece, box: RoomBox, tint: string | null, finish: Finish) {
  const pane = piece.kind === 'door' ? piece.pane : undefined
  const paint = (color: string, map?: THREE.Texture) =>
    new THREE.MeshStandardMaterial({
      ...(map ? { map } : {}),
      // Glass is nearly clear and a mirror is shiny; both let you see the inside.
      ...(pane === 'mirror' ? { metalness: 0.5 } : {}),
      color: tint ? new THREE.Color(color).lerp(new THREE.Color(tint), 0.45) : color,
      roughness: pane ? 0.1 : 0.85,
      // The back panel and doors would hide the inside from most angles, so they're faint.
      transparent: piece.kind === 'back' || piece.kind === 'door',
      opacity: piece.kind === 'back' ? 0.45 : pane === 'glass' ? 0.25 : pane === 'mirror' ? 0.6 : piece.kind === 'door' ? 0.35 : 1,
      // Keeps a faint door from hiding the parts behind it.
      depthWrite: piece.kind !== 'door',
    })
  const faceMaterial = paint(finish.face)
  const edgeMaterial = finish.edge && paint(finish.edge)
  const size = [0, 1, 2].map((axis) => box.max[axis] - box.min[axis])
  const [sx, sy, sz] = size
  // A face the grain lies along shows lines; one it runs into (the end of the board) stays plain.
  const grainFace = (index: number) => {
    const [u, v] = FACE_AXES[index]
    if (finish.grainAxis === u) return paint(finish.face, woodTexture('across', size[u], size[v]))
    if (finish.grainAxis === v) return paint(finish.face, woodTexture('up', size[u], size[v]))
    return faceMaterial
  }
  const grained = finish.grainAxis !== null && piece.kind !== 'rod' && !pane
  const material =
    (edgeMaterial || grained) && piece.kind !== 'rod'
      ? Array.from({ length: 6 }, (_, index) =>
          edgeMaterial && finish.bandedFaces.includes(index) ? edgeMaterial : grained ? grainFace(index) : faceMaterial,
        )
      : faceMaterial

  // A rod runs along its wall: across the room on the back wall, front to
  // back on a side wall.
  const geometry =
    piece.kind === 'rod'
      ? wallOf(piece) === 'back'
        ? new THREE.CylinderGeometry(sy / 2, sy / 2, sx, 24).rotateZ(Math.PI / 2)
        : new THREE.CylinderGeometry(sy / 2, sy / 2, sz, 24).rotateX(Math.PI / 2)
      : new THREE.BoxGeometry(sx, sy, sz)

  const mesh = new THREE.Mesh(geometry, material)
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 30),
    new THREE.LineBasicMaterial({ color: tint ?? EDGE }),
  )
  const group = new THREE.Group()
  group.add(mesh, edges)
  const [cx, cy, cz] = [0, 1, 2].map((axis) => (box.min[axis] + box.max[axis]) / 2)
  group.position.set(cx, cy, cz)
  return group
}

/**
 * The walls' footprint on the floor: the back wall and both side walls, with
 * the room's open front left out. Just above the floor grid, so it isn't hidden.
 */
function buildRoomOutline(room: Room) {
  const [x, z, y] = [room.width / 2, room.depth, 1]
  const points = [
    new THREE.Vector3(-x, y, z),
    new THREE.Vector3(-x, y, 0),
    new THREE.Vector3(x, y, 0),
    new THREE.Vector3(x, y, z),
  ]
  const group = new THREE.Group()
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: ROOM_LINE }),
    ),
  )
  return group
}

/** Everything placed, in room coordinates, or null when there's nothing. */
function sceneBounds(pieces: Piece[], thickness: Thickness, room: Room): RoomBox | null {
  if (pieces.length === 0) return null
  const zStart = wallDepthStart(pieces, thickness)
  return pieces
    .map((piece) => footprint(piece, zStart(piece), room))
    .reduce((all, box) => ({
      min: [0, 1, 2].map((axis) => Math.min(all.min[axis], box.min[axis])) as RoomBox['min'],
      max: [0, 1, 2].map((axis) => Math.max(all.max[axis], box.max[axis])) as RoomBox['max'],
    }))
}

function disposeChildren(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose()
      // A banded or grained part has a material per face, sharing some between them.
      const materials = [object.material].flat() as THREE.MeshStandardMaterial[]
      for (const material of new Set(materials)) {
        material.map?.dispose()
        material.dispose()
      }
    }
  })
  group.clear()
}
