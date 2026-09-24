import type { Piece, PieceKind, Thickness } from '../types'
import { BOARD, PIECE_LABELS } from './defaults'

export type CutListRow = {
  kind: PieceKind
  label: string
  quantity: number
  /** The longer of the board's two face sizes, in mm. */
  length: number
  /** The shorter of the board's two face sizes, in mm. */
  width: number
  thickness: number
  board: keyof Thickness
}

/**
 * Every board in the design, as a board shop would want it: length × width ×
 * thickness, with identical parts of the same kind counted together.
 *
 * A board's thickness axis comes from `BOARD`; the other two dimensions are its
 * face, listed longest first. Rods and drawers aren't flat boards, so they
 * aren't here.
 */
export function cutList(pieces: Piece[]): CutListRow[] {
  const rows = new Map<string, CutListRow>()

  for (const piece of pieces) {
    const board = BOARD[piece.kind]
    if (!board) continue

    const [a, b] = (['width', 'height', 'depth'] as const)
      .filter((dimension) => dimension !== board.axis)
      .map((dimension) => piece[dimension])
    const length = Math.max(a, b)
    const width = Math.min(a, b)
    const thickness = piece[board.axis]

    const key = `${piece.kind}|${length}|${width}|${thickness}`
    const row = rows.get(key)
    if (row) {
      row.quantity += 1
    } else {
      rows.set(key, {
        kind: piece.kind,
        label: PIECE_LABELS[piece.kind],
        quantity: 1,
        length,
        width,
        thickness,
        board: board.board,
      })
    }
  }

  // Thickest boards first (they're usually cut from separate sheets), then
  // biggest parts first within a thickness.
  return [...rows.values()].sort(
    (x, y) => y.thickness - x.thickness || y.length - x.length || y.width - x.width,
  )
}
