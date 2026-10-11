import type { AccessoryType, BoardKey, BoardMaterial, HandleType, PaneType, JointType, Dimension, Piece, PieceKind, Thickness } from '../types'

export const DEFAULT_THICKNESS: Thickness = { body: 18, back: 3, front: 18, drawer: 18 }

/** The boards in the order they're set up, with what each is for. */
export const BOARDS: { key: BoardKey; label: string; hint: string; example: string }[] = [
  {
    key: 'body',
    label: 'Body',
    hint: 'Carcass, shelves',
    example: 'white melamine',
  },
  { key: 'back', label: 'Back', hint: 'Backs, drawer bases', example: 'white HDF' },
  { key: 'front', label: 'Fronts', hint: 'Doors, drawer fronts', example: 'oak-veneer MDF' },
  {
    key: 'drawer',
    label: 'Drawer boxes',
    hint: 'Drawer sides, backs',
    example: 'birch plywood',
  },
]

/**
 * Longest a part or box can be, and how far from the middle of its wall or off
 * the floor it can sit: 50 m, far beyond any room. Without a limit a damaged
 * save with a 1e18 mm panel hangs the tab drawing its shelf holes and grid.
 */
export const MAX_LENGTH = 50_000
/** Thickest board a project can have, for the same reason. */
export const MAX_THICKNESS = 100
/**
 * Most parts a save can hold before it's refused as damaged: far more than a
 * room of wardrobes, few enough that the clash check (every pair) stays quick.
 */
export const MAX_PIECES = 5000

/** Longest board name kept, so a pasted paragraph can't take over the cut list. */
export const MAX_BOARD_NAME = 60

/** A board's name for the cut list: its own, or its role. */
export const boardName = (key: BoardKey, names: Partial<Record<BoardKey, string>>) =>
  names[key] ?? BOARDS.find((board) => board.key === key)!.label

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
/**
 * How far a door opens, in degrees: concealed hinges usually open to 110°,
 * which takes the door past square and back behind its hinge side.
 */
export const DOOR_OPEN_ANGLE = 110
/** Hinges sold by how far they open: standard, then wide-angle ones. */
export const DOOR_ANGLES = [DOOR_OPEN_ANGLE, 155, 170]
/** Starting sizes of the trim boards, in mm. */
export const FILLER_WIDTH = 50
export const CORNICE_HEIGHT = 80

/** Space between the two lanes sliding door panels run in, so they don't rub. */
export const SLIDING_LANE_GAP = 6

export const MATERIAL_LABELS: Record<BoardMaterial, string> = {
  chipboard: 'Chipboard',
  mdf: 'MDF',
  plywood: 'Plywood',
  solid: 'Solid wood',
}

export const JOINT_LABELS: Record<JointType, string> = {
  screws: 'Screws',
  confirmat: 'Confirmat screws',
  cam: 'Cam locks and dowels',
}

/** What each joint type is, in a line, for the settings. */
export const JOINT_HINTS: Record<JointType, string> = {
  screws: 'Plain screws through the sides.',
  confirmat: 'Confirmat screws (7 × 50 mm), the usual one for board.',
  cam: 'Cam locks with their bolts and dowels, for joints you can take apart.',
}

export const HANDLE_TYPES: HandleType[] = ['bar', 'knob', 'profile', 'push']

export const HANDLE_LABELS: Record<HandleType | 'handle' | 'none', string> = {
  handle: 'Handle or knob',
  bar: 'Bar handle',
  knob: 'Knob',
  profile: 'J-profile grip',
  push: 'Push-to-open',
  none: 'None',
}

export const PANE_TYPES: PaneType[] = ['glass', 'mirror']

export const PANE_LABELS: Record<PaneType, string> = { glass: 'Glass', mirror: 'Mirror' }

/** Glass and mirror panes are this thick, in mm, whatever the front board is. */
export const PANE_THICKNESS = 4

/**
 * The accessories that can be added to a unit, with the size each starts at
 * (a unit about 600 mm wide inside) and whether it pulls out on runners.
 * Bought as one fitting, so they're in the hardware list, not the cut list.
 */
export const ACCESSORIES: {
  type: AccessoryType
  label: string
  /** A word or two to write on the drawing, where there's room. */
  short: string
  width: number
  height: number
  depth: number
  pullOut: boolean
}[] = [
  { type: 'trouser', label: 'Pull-out trouser rack', short: 'Trousers', width: 500, height: 100, depth: 450, pullOut: true },
  { type: 'tie', label: 'Tie and belt rack', short: 'Ties and belts', width: 450, height: 80, depth: 450, pullOut: true },
  { type: 'basket', label: 'Pull-out wire basket', short: 'Basket', width: 564, height: 200, depth: 450, pullOut: true },
  { type: 'shoes-pullout', label: 'Pull-out shoe rack', short: 'Shoes', width: 564, height: 120, depth: 450, pullOut: true },
  { type: 'shoes-angled', label: 'Angled shoe shelf', short: 'Angled shoes', width: 564, height: 150, depth: 350, pullOut: false },
]

export const ACCESSORY_TYPES = ACCESSORIES.map((accessory) => accessory.type)

export const ACCESSORY_LABELS = Object.fromEntries(
  ACCESSORIES.map(({ type, label }) => [type, label]),
) as Record<AccessoryType, string>

/** The starting values for an accessory of this type. */
export function accessoryDefaults(type: AccessoryType): Partial<Piece> {
  const { width, height, depth } = ACCESSORIES.find((accessory) => accessory.type === type)!
  return { accessory: type, width, height, depth }
}

/** Panels in a set of sliding doors, fewest first; two is the default. */
export const SLIDING_PANELS = [2, 3, 4]
/** How far neighbouring sliding panels overlap, so there's no gap to see through. */
export const SLIDING_OVERLAP = 50
export const MAX_SLIDING_OVERLAP = 200
/** Height of the top and bottom track; the panels fit between them. */
export const SLIDING_TRACK_HEIGHT = 30
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
/** How drawer runners close, ordinary ones first. */
export const CLOSE_LABELS = { ordinary: 'Ordinary', soft: 'Soft-close', push: 'Push-to-open' } as const

/**
 * How much smaller a drawer front is than its space on each edge, so it
 * clears the unit and the fronts next to it: 3 mm between two fronts.
 */
export const FRONT_GAP = 1.5

/** How much lower the drawer box is than its front, so it can be lifted in and out. */
export const DRAWER_BOX_CLEARANCE = 30

/** Room clothes need below a hanging rod, measured down from the rod. */
export type HangingGuide = { label: string; length: number }

export const MAX_HANGING_GUIDES = 6
export const MAX_GUIDE_LABEL = 30

/** The guides a browser starts with; they can be changed in Settings. */
export const HANGING_GUIDES: HangingGuide[] = [
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
  filler: 'Filler strip',
  cornice: 'Cornice',
  accessory: 'Accessory',
}

/**
 * A piece's name: tells fixed shelves from adjustable ones, front rails from
 * back, single doors from double.
 */
export function pieceLabel(piece: Pick<Piece, 'kind' | 'fixed' | 'railAt' | 'double' | 'sliding' | 'accessory'>) {
  if (piece.kind === 'accessory') return piece.accessory ? ACCESSORY_LABELS[piece.accessory] : 'Accessory'
  if (piece.kind === 'shelf') return piece.fixed ? 'Fixed shelf' : 'Adjustable shelf'
  if (piece.kind === 'rail') return piece.railAt === 'back' ? 'Back rail' : 'Front rail'
  if (piece.kind === 'door') return piece.sliding ? 'Sliding doors' : piece.double ? 'Double door' : 'Door'
  return PIECE_LABELS[piece.kind]
}

export const PIECE_GROUPS: { title: string; kinds: PieceKind[] }[] = [
  { title: 'Panels', kinds: ['vertical', 'horizontal', 'back', 'plinth', 'rail'] },
  { title: 'Inside', kinds: ['shelf', 'divider', 'rod', 'drawer'] },
  { title: 'Fronts and trim', kinds: ['door', 'cornice', 'filler'] },
  // Offered as one button for each type of accessory, see `ACCESSORIES`.
  { title: 'Accessories', kinds: ['accessory'] },
]

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
  door: { axis: 'depth', board: 'front' },
  // Trim boards face forward like a door, cut from the front board.
  filler: { axis: 'depth', board: 'front' },
  cornice: { axis: 'depth', board: 'front' },
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
    // A narrow strip beside the unit, cut to the gap to the wall on site.
    case 'filler':
      return { width: FILLER_WIDTH, height: 2000, depth: 0 }
    case 'cornice':
      return { width: UNIT_WIDTH, height: CORNICE_HEIGHT, depth: 0 }
    // Sized by its type when added from Accessories; a basket otherwise.
    case 'accessory':
      return { width: inside, height: 200, depth: Math.max(1, unitDepth - SHELF_SETBACK) }
  }
}

/** Starting values for a set of sliding doors: two panels filling a unit's width. */
export function slidingDoorDefaults(thickness: Thickness): Partial<Piece> {
  return { sliding: SLIDING_PANELS[0], width: UNIT_WIDTH - 2 * thickness.body }
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
