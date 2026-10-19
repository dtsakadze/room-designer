import type { AccessoryType, ApplianceType, BoardKey, BoardMaterial, Dimension, Edge, HandleType, JointType, PaneType, Piece, PieceKind, Thickness } from '../types'

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
const ROD_DIAMETER = 25
const PLINTH_HEIGHT = 80
/** How far the plinth sits back from the front, so toes don't hit it. */
export const PLINTH_RECESS = 50
const RAIL_DEPTH = 100
/**
 * How far a door opens, in degrees: concealed hinges usually open to 110°,
 * which takes the door past square and back behind its hinge side.
 */
export const DOOR_OPEN_ANGLE = 110
/** Hinges sold by how far they open: standard, then wide-angle ones. */
export const DOOR_ANGLES = [DOOR_OPEN_ANGLE, 155, 170]
/** Starting sizes of the trim boards, in mm. */
const FILLER_WIDTH = 50
const CORNICE_HEIGHT = 80

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

/**
 * The appliances that can be placed, to see how they fit a kitchen, with the
 * usual size of each (a standard 600 mm one) and the height it's usually at
 * above the floor. Built-in ones sit in a run of units, so they start flush
 * with its front; the others stand against the wall. They're stand-ins: not
 * boards or fittings, so they're in neither the cut list nor the hardware list.
 */
export const APPLIANCES: {
  type: ApplianceType
  label: string
  /** A word or two to write on the drawing, where there's room. */
  short: string
  width: number
  height: number
  depth: number
  /** Usual height of its bottom above the floor, in mm. */
  y: number
  builtIn: boolean
}[] = [
  { type: 'fridge', label: 'Fridge', short: 'Fridge', width: 600, height: 1850, depth: 650, y: 0, builtIn: false },
  { type: 'washer', label: 'Washing machine', short: 'Washer', width: 600, height: 850, depth: 600, y: 0, builtIn: false },
  { type: 'dishwasher', label: 'Dishwasher', short: 'Dishwasher', width: 600, height: 820, depth: 570, y: 0, builtIn: true },
  { type: 'oven', label: 'Oven', short: 'Oven', width: 595, height: 595, depth: 550, y: 800, builtIn: true },
  { type: 'microwave', label: 'Microwave', short: 'Microwave', width: 595, height: 390, depth: 400, y: 1400, builtIn: true },
  { type: 'stove', label: 'Gas stove', short: 'Gas stove', width: 600, height: 850, depth: 600, y: 0, builtIn: false },
  { type: 'hood', label: 'Air vent', short: 'Air vent', width: 600, height: 500, depth: 450, y: 1500, builtIn: false },
]

export const APPLIANCE_TYPES = APPLIANCES.map((appliance) => appliance.type)

export const APPLIANCE_LABELS = Object.fromEntries(
  APPLIANCES.map(({ type, label }) => [type, label]),
) as Record<ApplianceType, string>

/** The starting values for an appliance of this type. */
export function applianceDefaults(type: ApplianceType): Partial<Piece> {
  const { width, height, depth, y } = APPLIANCES.find((appliance) => appliance.type === type)!
  return { appliance: type, width, height, depth, y }
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

/**
 * A piece's name: tells fixed shelves from adjustable ones, front rails from
 * back, single doors from double.
 */
export function pieceLabel(piece: Pick<Piece, 'kind' | 'fixed' | 'railAt' | 'double' | 'sliding' | 'accessory' | 'appliance'>) {
  if (piece.kind === 'accessory') return piece.accessory ? ACCESSORY_LABELS[piece.accessory] : 'Accessory'
  if (piece.kind === 'appliance') return piece.appliance ? APPLIANCE_LABELS[piece.appliance] : 'Appliance'
  if (piece.kind === 'shelf') return piece.fixed ? 'Fixed shelf' : 'Adjustable shelf'
  if (piece.kind === 'rail') return piece.railAt === 'back' ? 'Back rail' : 'Front rail'
  if (piece.kind === 'door') return piece.sliding ? 'Sliding doors' : piece.double ? 'Double door' : 'Door'
  return KINDS[piece.kind].label
}

export const PIECE_GROUPS: { title: string; kinds: PieceKind[] }[] = [
  { title: 'Panels', kinds: ['vertical', 'horizontal', 'back', 'plinth', 'rail'] },
  { title: 'Inside', kinds: ['shelf', 'divider', 'rod', 'drawer'] },
  { title: 'Fronts and trim', kinds: ['door', 'cornice', 'filler'] },
  // Offered as one button for each type of accessory, see `ACCESSORIES`.
  { title: 'Accessories', kinds: ['accessory'] },
  // Offered as one button for each appliance, see `APPLIANCES`.
  { title: 'Appliances', kinds: ['appliance'] },
]

/** What a part is as a whole, the same for every part of its kind. */
type KindInfo = {
  label: string
  /**
   * Which dimension of the board is its thickness, and which project board it
   * follows. Rods, drawers and accessories aren't flat boards, so they have none.
   */
  board?: { axis: Dimension; board: BoardKey }
  /**
   * Starting size, for a unit `inside` wide between its sides and `depth`
   * deep. A board's thickness is left at 0 here: it always comes from the
   * project thickness (see `normalizePiece`).
   */
  size: (inside: number, depth: number) => Pick<Piece, Dimension>
  /**
   * The edges usually banded: the ones that show once it's built. Back
   * rails and glass doors have none (see `autoBands`).
   */
  bands: Edge[]
  /**
   * The way the grain usually runs: along the part as it stands, so it
   * follows the unit's lines. Drawers have their front's. Null for parts
   * that aren't boards.
   */
  grain: Dimension | null
  /** Sides and dividers: shelves rest on them and are screwed to them, and the openings are between them. */
  upright?: true
  /** Runs across the unit from one side to the other, so it can be fitted between its sides. */
  spans?: true
  /** The carcass and what's inside it, flush with its back: these set how deep the unit is (see `wallDepthStart`). */
  setsDepth?: true
}

/** Depth of a shelf or divider in a unit this deep. */
const shelfDepth = (depth: number) => Math.max(1, depth - SHELF_SETBACK)

/** Every kind of part, and the facts that hold for all of that kind. Depths follow the project's unit depth, so a bookshelf project starts with shallow parts. */
export const KINDS: Record<PieceKind, KindInfo> = {
  vertical: {
    label: 'Side panel',
    board: { axis: 'width', board: 'body' },
    size: (_inside, depth) => ({ width: 0, height: 2000, depth }),
    bands: ['front'],
    grain: 'height',
    upright: true,
    setsDepth: true,
  },
  horizontal: {
    label: 'Top / bottom',
    board: { axis: 'height', board: 'body' },
    size: (_inside, depth) => ({ width: UNIT_WIDTH, height: 0, depth }),
    bands: ['front'],
    grain: 'width',
    spans: true,
    setsDepth: true,
  },
  back: {
    label: 'Back panel',
    board: { axis: 'depth', board: 'back' },
    size: () => ({ width: UNIT_WIDTH, height: 2000, depth: 0 }),
    bands: [],
    grain: 'height',
    setsDepth: true,
  },
  shelf: {
    label: 'Shelf',
    board: { axis: 'height', board: 'body' },
    size: (inside, depth) => ({ width: inside, height: 0, depth: shelfDepth(depth) }),
    bands: ['front'],
    grain: 'width',
    spans: true,
    setsDepth: true,
  },
  divider: {
    label: 'Divider',
    board: { axis: 'width', board: 'body' },
    size: (_inside, depth) => ({ width: 0, height: 1000, depth: shelfDepth(depth) }),
    bands: ['front'],
    grain: 'height',
    upright: true,
    setsDepth: true,
  },
  rod: {
    label: 'Hanging rod',
    size: (inside) => ({ width: inside, height: ROD_DIAMETER, depth: ROD_DIAMETER }),
    bands: [],
    grain: null,
    spans: true,
  },
  drawer: {
    label: 'Drawer',
    size: (inside, depth) => ({ width: inside, height: 200, depth: Math.max(1, depth - DRAWER_SETBACK) }),
    bands: [],
    // Left to right, so a stack of drawers reads as a row of boards.
    grain: 'width',
    spans: true,
  },
  plinth: {
    label: 'Plinth',
    // The base board the unit stands on, facing forward like the back panel.
    board: { axis: 'depth', board: 'body' },
    size: (inside) => ({ width: inside, height: PLINTH_HEIGHT, depth: 0 }),
    bands: [],
    grain: 'width',
    spans: true,
  },
  rail: {
    label: 'Rail',
    // A narrow strip joining the sides, used instead of a full top.
    board: { axis: 'height', board: 'body' },
    size: (inside) => ({ width: inside, height: 0, depth: RAIL_DEPTH }),
    bands: ['front'],
    grain: 'width',
    spans: true,
  },
  door: {
    label: 'Door',
    // Faces forward, in front of the unit (overlay) or inside its opening (inset).
    board: { axis: 'depth', board: 'front' },
    // Half the default unit: one of a pair of single doors, or resized to fit.
    size: () => ({ width: UNIT_WIDTH / 2, height: 2000, depth: 0 }),
    bands: ['top', 'bottom', 'left', 'right'],
    grain: 'height',
  },
  filler: {
    label: 'Filler strip',
    // Trim boards face forward like a door, cut from the front board.
    board: { axis: 'depth', board: 'front' },
    // A narrow strip beside the unit, cut to the gap to the wall on site, so not banded.
    size: () => ({ width: FILLER_WIDTH, height: 2000, depth: 0 }),
    bands: [],
    grain: 'height',
  },
  cornice: {
    label: 'Cornice',
    board: { axis: 'depth', board: 'front' },
    size: () => ({ width: UNIT_WIDTH, height: CORNICE_HEIGHT, depth: 0 }),
    // Its top is against the ceiling.
    bands: ['bottom', 'left', 'right'],
    grain: 'width',
  },
  accessory: {
    label: 'Accessory',
    // Sized by its type when added from Accessories; a basket otherwise.
    size: (inside, depth) => ({ width: inside, height: 200, depth: shelfDepth(depth) }),
    bands: [],
    grain: null,
  },
  appliance: {
    label: 'Appliance',
    // Sized by its type when added from Appliances; a fridge otherwise.
    size: () => ({ width: 600, height: 1850, depth: 650 }),
    bands: [],
    grain: null,
  },
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
  const size = KINDS[kind].size(UNIT_WIDTH - 2 * thickness.body, unitDepth)
  const board = KINDS[kind].board
  if (board) size[board.axis] = thickness[board.board]
  return { id, kind, x: -size.width / 2, y: 0, ...size }
}
