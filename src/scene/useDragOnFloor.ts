import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import type { Part } from '../types'
import { MM } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'

type DragState = {
  pointerId: number
  plane: Plane
  start: Vector3
  originX: number
  originZ: number
}

/**
 * Drags a part across the horizontal plane it currently sits on. Y is edited
 * numerically in the inspector.
 */
export function useDragOnFloor(part: Part) {
  const updatePart = useDesignStore((s) => s.updatePart)
  const select = useDesignStore((s) => s.select)
  const setOrbitEnabled = useDesignStore((s) => s.setOrbitEnabled)
  const drag = useRef<DragState | null>(null)
  const hit = useRef(new Vector3())

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    select(part.id)
    ;(event.target as Element | null)?.setPointerCapture?.(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      plane: new Plane(new Vector3(0, 1, 0), -event.point.y),
      start: event.point.clone(),
      originX: part.x,
      originZ: part.z,
    }
    setOrbitEnabled(false)
  }

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    event.stopPropagation()
    if (!event.ray.intersectPlane(state.plane, hit.current)) return
    updatePart(part.id, {
      x: Math.round(state.originX + (hit.current.x - state.start.x) / MM),
      z: Math.round(state.originZ + (hit.current.z - state.start.z) / MM),
    })
  }

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    ;(event.target as Element | null)?.releasePointerCapture?.(event.pointerId)
    drag.current = null
    setOrbitEnabled(true)
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}
