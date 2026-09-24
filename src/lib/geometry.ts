import type { Piece, Thickness } from '../types'
import { BOARD } from './defaults'

/**
 * Keeps a piece a sane size and stops it sinking through the floor. A board's
 * thickness is always reset to the project thickness, so it can't drift.
 */
export function normalizePiece(piece: Piece, thickness: Thickness): Piece {
  const height = atLeast(piece.height)
  const normalized = {
    ...piece,
    width: atLeast(piece.width),
    height,
    // A rod is round, so its height and depth are one number: the diameter.
    depth: piece.kind === 'rod' ? height : atLeast(piece.depth),
    x: round(piece.x),
    y: Math.max(0, round(piece.y)),
  }
  const board = BOARD[piece.kind]
  if (board) normalized[board.axis] = atLeast(thickness[board.board])
  return normalized
}

/** Bounding box of everything placed so far, in mm. */
export function contentBounds(pieces: Piece[]) {
  if (pieces.length === 0) return null
  return pieces.reduce(
    (bounds, piece) => ({
      minX: Math.min(bounds.minX, piece.x),
      maxX: Math.max(bounds.maxX, piece.x + piece.width),
      minY: Math.min(bounds.minY, piece.y),
      maxY: Math.max(bounds.maxY, piece.y + piece.height),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
}

const round = (value: number) => (Number.isNaN(value) ? 0 : Math.round(value))
const atLeast = (value: number, min = 1) => Math.max(min, round(value))
