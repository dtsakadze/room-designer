import type { ThreeEvent } from '@react-three/fiber'
import { CABINET_ID } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { toScene } from '../lib/units'
import { Panel } from './Panel'

const CARCASS_COLOR = '#d8c9a3'

/** The wardrobe box: two sides, a top, a bottom and an optional back. */
export function Carcass() {
  const cabinet = useDesignStore((s) => s.cabinet)
  const selected = useDesignStore((s) => s.selectedId === CABINET_ID)
  const select = useDesignStore((s) => s.select)

  const { width: w, height: h, depth: d, thickness: t, hasBack } = cabinet
  const innerH = Math.max(0, h - t * 2)
  const innerW = Math.max(0, w - t * 2)

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    select(CABINET_ID)
  }

  const panels: { key: string; size: [number, number, number]; position: [number, number, number] }[] = [
    { key: 'bottom', size: [w, t, d], position: [0, toScene(t / 2), 0] },
    { key: 'top', size: [w, t, d], position: [0, toScene(h - t / 2), 0] },
    { key: 'left', size: [t, innerH, d], position: [toScene(-w / 2 + t / 2), toScene(h / 2), 0] },
    { key: 'right', size: [t, innerH, d], position: [toScene(w / 2 - t / 2), toScene(h / 2), 0] },
  ]

  if (hasBack) {
    panels.push({
      key: 'back',
      size: [innerW, innerH, t],
      position: [0, toScene(h / 2), toScene(-d / 2 + t / 2)],
    })
  }

  return (
    <group>
      {panels.map((panel) => (
        <Panel
          key={panel.key}
          size={panel.size}
          position={panel.position}
          color={CARCASS_COLOR}
          selected={selected}
          onPointerDown={onPointerDown}
        />
      ))}
    </group>
  )
}
