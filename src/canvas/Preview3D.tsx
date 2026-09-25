import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { contentBounds } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'
import type { Piece } from '../types'
import { FILLS, SELECTED } from './colors'
import { depthStart } from './views'

const BACKGROUND = '#f4f6f9'
const EDGE = '#6f6450'

/**
 * A 3D look at the unit, in mm, with the same axes as the design: x right, y
 * up from the floor, z out of the wall towards the viewer. It's for looking
 * only; editing stays in the flat views. Loaded on demand, so three.js only
 * downloads once someone opens it.
 */
export default function Preview3D() {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{ scene: THREE.Scene; parts: THREE.Group; frame: () => void } | null>(null)

  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const selectedId = useDesignStore((s) => s.selectedId)

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

    const camera = new THREE.PerspectiveCamera(35, 1, 10, 200000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    // Stay above the floor: looking up from under it isn't useful.
    controls.maxPolarAngle = Math.PI / 2 - 0.02

    /** Frames the unit from the front-right and a little above. */
    const frame = () => {
      const bounds = contentBounds(useDesignStore.getState().pieces)
      const box = bounds
        ? { x: [bounds.minX, bounds.maxX], y: [bounds.minY, bounds.maxY] }
        : { x: [-600, 600], y: [0, 2000] }
      const center = new THREE.Vector3((box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, 300)
      const size = Math.max(box.x[1] - box.x[0], box.y[1] - box.y[0], 600)
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

    sceneRef.current = { scene, parts, frame }
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      disposeChildren(parts)
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
    const zStart = depthStart(pieces, thickness)
    for (const piece of pieces) {
      current.parts.add(buildPiece(piece, zStart(piece), piece.id === selectedId))
    }
  }, [pieces, thickness, selectedId])

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

/** One piece as a solid with outlined edges; a rod as a cylinder along x. */
function buildPiece(piece: Piece, z: number, selected: boolean) {
  const material = new THREE.MeshStandardMaterial({
    // Tinted rather than solid blue, so the selected part still reads as wood.
    color: selected
      ? new THREE.Color(FILLS[piece.kind]).lerp(new THREE.Color(SELECTED), 0.45)
      : FILLS[piece.kind],
    roughness: 0.85,
    // The back panel would hide the inside from most angles, so it's faint.
    transparent: piece.kind === 'back',
    opacity: piece.kind === 'back' ? 0.45 : 1,
  })

  const geometry =
    piece.kind === 'rod'
      ? new THREE.CylinderGeometry(piece.height / 2, piece.height / 2, piece.width, 24).rotateZ(
          Math.PI / 2,
        )
      : new THREE.BoxGeometry(piece.width, piece.height, piece.depth)

  const mesh = new THREE.Mesh(geometry, material)
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 30),
    new THREE.LineBasicMaterial({ color: selected ? SELECTED : EDGE }),
  )
  const group = new THREE.Group()
  group.add(mesh, edges)
  group.position.set(piece.x + piece.width / 2, piece.y + piece.height / 2, z + piece.depth / 2)
  return group
}

function disposeChildren(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.dispose()
      ;(object.material as THREE.Material).dispose()
    }
  })
  group.clear()
}
