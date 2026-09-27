import { useMemo } from 'react'
import { findClashes } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'

/** Ids of parts that overlap another part, recomputed when the design changes. */
export function useClashes() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  return useMemo(() => findClashes(pieces, thickness, room), [pieces, thickness, room])
}
