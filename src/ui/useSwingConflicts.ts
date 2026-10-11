import { useMemo } from 'react'
import { swingConflicts } from '../lib/swing'
import { useDesignStore } from '../store/useDesignStore'

/** What each door hits as it opens, by door id, recomputed when the design changes. */
export function useSwingConflicts() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  return useMemo(() => swingConflicts(pieces, thickness, room), [pieces, thickness, room])
}
