import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { wallDepthStart } from '../lib/geometry'
import { type RoomBox, hasSideWalls, roomBox, wallOf } from '../lib/room'
import { useDesignStore } from '../store/useDesignStore'
import { useClashes } from '../ui/useClashes'
import type { Piece, Room, Thickness } from '../types'
import { CLASH, FILLS, SELECTED } from './colors'

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
  } | null>(null)

  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  const selectedId = useDesignStore((s) => s.selectedId)
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
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    frame()

    let raf = 0
    const loop = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()

    sceneRef.current = { scene, parts, walls, frame }
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      disposeChildren(parts)
      disposeChildren(walls)
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
      const tint = piece.id === selectedId ? SELECTED : clashes.has(piece.id) ? CLASH : null
      current.parts.add(buildPiece(piece, roomBox(piece, zStart(piece), room), tint))
    }
  }, [pieces, thickness, room, selectedId, clashes])

  // The room's outline on the floor, once there's more than one wall.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    disposeChildren(current.walls)
    if (hasSideWalls(room)) current.walls.add(buildRoomOutline(room))
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
 * One piece as a solid with outlined edges; a rod as a cylinder along x.
 * `tint` (selection blue or clash red) is mixed in rather than painted over,
 * so the part still reads as wood.
 */
function buildPiece(piece: Piece, box: RoomBox, tint: string | null) {
  const material = new THREE.MeshStandardMaterial({
    color: tint
      ? new THREE.Color(piece.color ?? FILLS[piece.kind]).lerp(new THREE.Color(tint), 0.45)
      : (piece.color ?? FILLS[piece.kind]),
    roughness: 0.85,
    // The back panel would hide the inside from most angles, so it's faint.
    transparent: piece.kind === 'back',
    opacity: piece.kind === 'back' ? 0.45 : 1,
  })

  const [sx, sy, sz] = [0, 1, 2].map((axis) => box.max[axis] - box.min[axis])
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
    .map((piece) => roomBox(piece, zStart(piece), room))
    .reduce((all, box) => ({
      min: [0, 1, 2].map((axis) => Math.min(all.min[axis], box.min[axis])) as RoomBox['min'],
      max: [0, 1, 2].map((axis) => Math.max(all.max[axis], box.max[axis])) as RoomBox['max'],
    }))
}

function disposeChildren(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose()
      ;(object.material as THREE.Material).dispose()
    }
  })
  group.clear()
}
