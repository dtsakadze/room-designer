import { useMemo } from 'react'
import { spanWarnings } from '../lib/spans'
import { useDesignStore } from '../store/useDesignStore'

/** Shelves and rods that span too far, by part id, recomputed when the design changes. */
export function useSpanWarnings() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const materials = useDesignStore((s) => s.boardMaterials)
  return useMemo(() => spanWarnings(pieces, thickness, materials), [pieces, thickness, materials])
}
