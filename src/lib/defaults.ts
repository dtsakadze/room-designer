import type { Piece, PieceKind, Thickness } from '../types'

export const DEFAULT_THICKNESS: Thickness = { body: 18, back: 3 }

/** Typical unit depths: a wardrobe fits a coat on a hanger, shelving doesn't need to. */
export const DEPTH_PRESETS = [
  { label: 'Wardrobe', depth: 600 },
  { label: 'Shelving', depth: 350 },
]
export const DEFAULT_UNIT_DEPTH = 600
export const MIN_UNIT_DEPTH = 100
export const MAX_UNIT_DEPTH = 1500
/** Shelves and dividers sit this far back from the front edge. */
const SHELF_SETBACK = 20
/** A new drawer leaves this much room behind it, for runner lengths to fit. */
const DRAWER_SETBACK = 50
export const ROD_DIAMETER = 25
export const PLINTH_HEIGHT = 80
/** How far the plinth sits back from the front, so toes don't hit it. */
export const PLINTH_RECESS = 50
export const RAIL_DEPTH = 100
/** The gap between the two leaves of a double door, so they don't rub. */
export const DOOR_LEAF_GAP = 3
/**
 * Room each drawer runner takes between the drawer box and the side of the
 * opening, per side. Most side-mounted runners need 12.5–13 mm.
 */
export const RUNNER_GAP = 13
/** Runner lengths sold, shortest first; a drawer box is as long as its runners. */
export const RUNNER_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700]
export const EXTENSION_LABELS = { standard: 'Standard', full: 'Full extension' } as const

/**
 * How much smaller a drawer front is than its space on each edge, so it
 * clears the unit and the fronts next to it: 3 mm between two fronts.
 */
export const FRONT_GAP = 1.5

/** How much lower the drawer box is than its front, so it can be lifted in and out. */
export const DRAWER_BOX_CLEARANCE = 30

/** Room clothes need below a hanging rod, measured down from the rod. */
export const HANGING_GUIDES = [
  { label: 'Shirts, jackets', length: 1000 },
  { label: 'Coats, dresses', length: 1700 },
]

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
  door: 'Door',
}

/**
 * A piece's name: tells fixed shelves from adjustable ones, front rails from
 * back, single doors from double.
 */
export function pieceLabel(piece: Pick<Piece, 'kind' | 'fixed' | 'railAt' | 'double'>) {
  if (piece.kind === 'shelf') return piece.fixed ? 'Fixed shelf' : 'Adjustable shelf'
  if (piece.kind === 'rail') return piece.railAt === 'back' ? 'Back rail' : 'Front rail'
  if (piece.kind === 'door') return piece.double ? 'Double door' : 'Door'
  return PIECE_LABELS[piece.kind]
}

export const PIECE_GROUPS: { title: string; kinds: PieceKind[] }[] = [
  { title: 'Panels', kinds: ['vertical', 'horizontal', 'back', 'plinth', 'rail'] },
  { title: 'Fittings', kinds: ['shelf', 'divider', 'rod', 'drawer'] },
  { title: 'Fronts', kinds: ['door'] },
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
  // Faces forward, in front of the unit (overlay) or inside its opening (inset).
  door: { axis: 'depth', board: 'body' },
}

/**
 * Starting sizes. A board's thickness axis is left out here: it always comes
 * from the project thickness (see `normalizePiece`). Depths follow the
 * project's unit depth, so a bookshelf project starts with shallow parts.
 */
function dimensions(
  kind: PieceKind,
  thickness: Thickness,
  unitDepth: number,
): Pick<Piece, Dimension> {
  const inside = UNIT_WIDTH - 2 * thickness.body
  const shelfDepth = Math.max(1, unitDepth - SHELF_SETBACK)
  switch (kind) {
    case 'vertical':
      return { width: 0, height: 2000, depth: unitDepth }
    case 'horizontal':
      return { width: UNIT_WIDTH, height: 0, depth: unitDepth }
    case 'back':
      return { width: UNIT_WIDTH, height: 2000, depth: 0 }
    case 'shelf':
      return { width: inside, height: 0, depth: shelfDepth }
    case 'divider':
      return { width: 0, height: 1000, depth: shelfDepth }
    case 'rod':
      return { width: inside, height: ROD_DIAMETER, depth: ROD_DIAMETER }
    case 'drawer':
      return { width: inside, height: 200, depth: Math.max(1, unitDepth - DRAWER_SETBACK) }
    case 'rail':
      return { width: inside, height: 0, depth: RAIL_DEPTH }
    case 'plinth':
      return { width: inside, height: PLINTH_HEIGHT, depth: 0 }
    // Half the default unit: one of a pair of single doors, or resized to fit.
    case 'door':
      return { width: UNIT_WIDTH / 2, height: 2000, depth: 0 }
  }
}

/** A fresh piece, centred on x = 0 and sitting on the floor. */
export function createPiece(
  kind: PieceKind,
  id: string,
  thickness: Thickness,
  unitDepth = DEFAULT_UNIT_DEPTH,
): Piece {
  const size = dimensions(kind, thickness, unitDepth)
  const board = BOARD[kind]
  if (board) size[board.axis] = thickness[board.board]
  return { id, kind, x: -size.width / 2, y: 0, ...size }
}
