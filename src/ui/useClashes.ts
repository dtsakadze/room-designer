import { useMemo } from 'react'
import { findClashes } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'

/** Ids of parts that overlap another part, recomputed when the design changes. */
export function useClashes() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  return useMemo(() => findClashes(pieces, thickness), [pieces, thickness])
}
