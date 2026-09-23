import { Edges } from '@react-three/drei'
import type { Cabinet, Part } from '../types'
import { partToWorld } from '../lib/geometry'
import { toScene } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useDragOnFloor } from './useDragOnFloor'
import { Panel } from './Panel'

const COLORS: Record<Part['kind'], string> = {
  shelf: '#e0cfa8',
  divider: '#d3bf93',
  rod: '#9aa5b1',
  drawer: '#c4ab7e',
}

export function PartMesh({ part, cabinet }: { part: Part; cabinet: Cabinet }) {
  const selected = useDesignStore((s) => s.selectedId === part.id)
  const handlers = useDragOnFloor(part)
  const position = partToWorld(part, cabinet)

  if (part.kind === 'rod') {
    const radius = toScene(Math.min(part.height, part.depth) / 2)
    return (
      <mesh
        position={position}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
        {...handlers}
      >
        <cylinderGeometry args={[radius, radius, toScene(part.width), 16]} />
        <meshStandardMaterial
          color={COLORS.rod}
          roughness={0.35}
          metalness={0.6}
          emissive={selected ? '#2563eb' : '#000000'}
          emissiveIntensity={selected ? 0.4 : 0}
        />
        {selected && <Edges color="#2563eb" scale={1.02} />}
      </mesh>
    )
  }

  return (
    <Panel
      size={[part.width, part.height, part.depth]}
      position={position}
      color={COLORS[part.kind]}
      selected={selected}
      {...handlers}
    />
  )
}
