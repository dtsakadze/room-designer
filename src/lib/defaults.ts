import type { Piece, PieceKind, Thickness } from '../types'

export const DEFAULT_THICKNESS: Thickness = { body: 18, back: 3 }
export const ROD_DIAMETER = 25
export const PLINTH_HEIGHT = 80
/** How far the plinth sits back from the front, so toes don't hit it. */
export const PLINTH_RECESS = 50
export const RAIL_DEPTH = 100

/** Outer width the default pieces are sized for; fittings fill its inside. */
const UNIT_WIDTH = 1200

/** Gap left between a new piece and whatever is already on the floor. */
export const PLACEMENT_GAP = 100

/** Dragging and nudging snap to this grid, in mm. */
export const SNAP = 10

export const PIECE_LABELS: Record<PieceKind, string> = {
  vertical: 'Side panel',
  horizontal: 'Top / bottom',
  back: 'Back panel',
  shelf: 'Shelf',
  divider: 'Divider',
  rod: 'Hanging rod',
  drawer: 'Drawer',
  plinth: 'Plinth',
  rail: 'Rail',
}

/** A piece's name: tells fixed shelves from adjustable ones, front rails from back. */
export function pieceLabel(piece: Pick<Piece, 'kind' | 'fixed' | 'railAt'>) {
  if (piece.kind === 'shelf') return piece.fixed ? 'Fixed shelf' : 'Adjustable shelf'
  if (piece.kind === 'rail') return piece.railAt === 'back' ? 'Back rail' : 'Front rail'
  return PIECE_LABELS[piece.kind]
}

export const PIECE_GROUPS: { title: string; kinds: PieceKind[] }[] = [
  { title: 'Panels', kinds: ['vertical', 'horizontal', 'back', 'plinth', 'rail'] },
  { title: 'Fittings', kinds: ['shelf', 'divider', 'rod', 'drawer'] },
]

type Dimension = 'width' | 'height' | 'depth'

/**
 * Which dimension of a board is its thickness, and which project thickness it
 * follows. Rods and drawers aren't flat boards, so they have none.
 */
export const BOARD: Partial<Record<PieceKind, { axis: Dimension; board: keyof Thickness }>> = {
  vertical: { axis: 'width', board: 'body' },
  divider: { axis: 'width', board: 'body' },
  horizontal: { axis: 'height', board: 'body' },
  shelf: { axis: 'height', board: 'body' },
  back: { axis: 'depth', board: 'back' },
  // The base board the unit stands on, facing forward like the back panel.
  plinth: { axis: 'depth', board: 'body' },
  // A narrow strip joining the sides, used instead of a full top.
  rail: { axis: 'height', board: 'body' },
}

/**
 * Starting sizes. A board's thickness axis is left out here: it always comes
 * from the project thickness (see `normalizePiece`).
 */
function dimensions(kind: PieceKind, thickness: Thickness): Pick<Piece, Dimension> {
  const inside = UNIT_WIDTH - 2 * thickness.body
  switch (kind) {
    case 'vertical':
      return { width: 0, height: 2000, depth: 600 }
    case 'horizontal':
      return { width: UNIT_WIDTH, height: 0, depth: 600 }
    case 'back':
      return { width: UNIT_WIDTH, height: 2000, depth: 0 }
    case 'shelf':
      return { width: inside, height: 0, depth: 580 }
    case 'divider':
      return { width: 0, height: 1000, depth: 580 }
    case 'rod':
      return { width: inside, height: ROD_DIAMETER, depth: ROD_DIAMETER }
    case 'drawer':
      return { width: inside, height: 200, depth: 550 }
    case 'rail':
      return { width: inside, height: 0, depth: RAIL_DEPTH }
    case 'plinth':
      return { width: inside, height: PLINTH_HEIGHT, depth: 0 }
  }
}

/** A fresh piece, centred on x = 0 and sitting on the floor. */
export function createPiece(kind: PieceKind, id: string, thickness: Thickness): Piece {
  const size = dimensions(kind, thickness)
  const board = BOARD[kind]
  if (board) size[board.axis] = thickness[board.board]
  return { id, kind, x: -size.width / 2, y: 0, ...size }
}
