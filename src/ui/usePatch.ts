import { useDesignStore } from '../store/useDesignStore'
import type { Piece } from '../types'

/** Changes this part: `updatePiece` with its id filled in. */
export function usePatch(piece: Piece) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  return (patch: Parameters<typeof updatePiece>[1]) => updatePiece(piece.id, patch)
}
