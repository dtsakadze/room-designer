import { useMemo } from 'react'
import { roomOverhangs } from '../lib/roomFit'
import { useDesignStore } from '../store/useDesignStore'

/** Parts that stick out past a wall or the ceiling, by part id, recomputed when the design changes. */
export function useRoomOverhangs() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  return useMemo(() => roomOverhangs(pieces, thickness, room), [pieces, thickness, room])
}
