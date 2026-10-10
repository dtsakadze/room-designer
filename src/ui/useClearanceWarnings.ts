import { useMemo } from 'react'
import { clearanceWarnings } from '../lib/clearance'
import { useDesignStore } from '../store/useDesignStore'

/** Drawers too close behind their doors, and those doors, by part id, recomputed when the design changes. */
export function useClearanceWarnings() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  return useMemo(() => clearanceWarnings(pieces, thickness), [pieces, thickness])
}
