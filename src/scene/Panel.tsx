import type { ThreeEvent } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { toScene } from '../lib/units'

type PanelProps = {
  /** Size in mm. */
  size: [number, number, number]
  /** Centre position in metres. */
  position: [number, number, number]
  color?: string
  selected?: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
}

export function Panel({
  size,
  position,
  color = '#c9a227',
  selected = false,
  ...handlers
}: PanelProps) {
  return (
    <mesh position={position} castShadow receiveShadow {...handlers}>
      <boxGeometry args={[toScene(size[0]), toScene(size[1]), toScene(size[2])]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.05}
        emissive={selected ? '#2563eb' : '#000000'}
        emissiveIntensity={selected ? 0.35 : 0}
      />
      {selected && <Edges color="#2563eb" scale={1.01} />}
    </mesh>
  )
}
