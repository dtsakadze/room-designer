export type PieceKind =
  | 'vertical'
  | 'horizontal'
  | 'back'
  | 'shelf'
  | 'divider'
  | 'rod'
  | 'drawer'
  | 'plinth'
  | 'rail'
  | 'door'
  | 'filler'
  | 'cornice'
  | 'accessory'

/**
 * One board, seen head-on. Everything lives in a single 2D world measured in
 * mm: `x`/`y` is the piece's bottom-left corner, y counts UP from the floor,
 * and x = 0 is the middle of the drawing.
 *
 * `depth` is carried for real-world completeness (cut lists later) but is not
 * drawn in this elevation view.
 */
/**
 * The boards a project is built from: `body` for the carcass, shelves and
 * dividers, `back` for back panels and drawer bottoms, `front` for doors and
 * drawer fronts, `drawer` for the sides and backs of drawer boxes.
 */
export type BoardKey = 'body' | 'back' | 'front' | 'drawer'

/**
 * Board thicknesses for the whole project, in mm. Every board piece takes its
 * thickness from here rather than storing its own, so changing one number
 * updates every panel of that kind.
 */
export type Thickness = Record<BoardKey, number>

/**
 * What each board is, in the project's own words (e.g. "18 mm white
 * melamine"), for the cut list. A board without one goes by its role.
 */
export type BoardNames = Partial<Record<BoardKey, string>>

/** What a board is made of, which decides how far a shelf cut from it can span before it sags. */
export type BoardMaterial = 'chipboard' | 'mdf' | 'plywood' | 'solid'

/** The material of each board. A board without one is chipboard, the commonest and the most cautious. */
export type BoardMaterials = Partial<Record<BoardKey, BoardMaterial>>

/**
 * How the carcass is put together, for the hardware list: plain screws,
 * confirmat screws, or cam locks with their bolts and dowels.
 */
export type JointType = 'screws' | 'confirmat' | 'cam'

/**
 * What a door or drawer front is opened with, when it isn't the unspecified
 * "handle or knob": a bar handle, a knob, a grip routed or fitted into the
 * edge (J-profile), or a push-to-open latch (doors only).
 */
export type HandleType = 'bar' | 'knob' | 'profile' | 'push'

/** What a door's panels are made of when they aren't board: glass or a mirror. */
export type PaneType = 'glass' | 'mirror'

/**
 * The full sheet a board is bought as, in mm: `length` runs along the grain,
 * and `kerf` is what the saw cut takes away at every cut.
 */
export type SheetSetup = { length: number; width: number; kerf: number }

/**
 * The boards bought as whole sheets, with the sheet each comes on. A board
 * without one is bought cut to size, from the cut list.
 */
export type BoardSheets = Partial<Record<BoardKey, SheetSetup>>

/** The kinds of accessory that fit in a unit: bought as one fitting, not cut from board. */
export type AccessoryType = 'trouser' | 'tie' | 'basket' | 'shoes-pullout' | 'shoes-angled'

/** A colour (`#rrggbb`) per board, for the parts cut from it or their edge banding. Absent means the standard look. */
export type BoardColors = Partial<Record<BoardKey, string>>

/** A piece's three sizes; on a board, one of them is its thickness. */
export type Dimension = 'width' | 'height' | 'depth'

/** A board's edges, named by the way they face in the unit, seen from the front. */
export type Edge = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'

export type Piece = {
  id: string
  kind: PieceKind
  x: number
  y: number
  width: number
  height: number
  depth: number
  /**
   * Shelves only: screwed to the sides, so it holds them straight (a
   * structural shelf) rather than resting on pins. Absent means adjustable.
   */
  fixed?: boolean
  /** Rails only: which edge of the unit the strip runs along. Absent means front. */
  railAt?: 'front' | 'back'
  /**
   * Doors only: two leaves meeting in the middle, each hinged on its outer
   * side, instead of one. `width` is both leaves together, gap included.
   */
  double?: boolean
  /** Single doors only: the side the hinges are on, seen from the front. Absent means left. */
  hinge?: 'left' | 'right'
  /**
   * Doors only: sits inside the unit's opening, flush with its front edges,
   * rather than in front of them. Absent means overlay.
   */
  inset?: boolean
  /**
   * Doors only: how far its hinges open, in degrees, when they're wide-angle
   * ones (155 or 170). Absent means standard hinges, 110°.
   */
  openAngle?: number
  /** Doors only: hinges that close the door gently. Absent means ordinary ones. */
  softClose?: boolean
  /**
   * Doors only: a set of sliding doors, this many panels (2 to 4) running in
   * tracks along the top and bottom, instead of a hinged door. `width` and
   * `height` are the whole set, tracks included. Absent means hinged.
   */
  sliding?: number
  /** Sliding doors only: how far neighbouring panels overlap, in mm. Absent means the standard overlap. */
  overlap?: number
  /**
   * Doors only: its panels are glass or a mirror rather than board, so they
   * have no board finish (colour, banding, grain) and a thickness of their
   * own. Absent means a board door.
   */
  pane?: PaneType
  /** Rods only: hung from a pull-down lift instead of end supports. Absent means a fixed rod. */
  lift?: boolean
  /** Accessories only: which kind it is (a pull-out trouser rack, a wire basket, a shoe rack, …). */
  accessory?: AccessoryType
  /** Doors and drawers only: has no handle or knob. Absent means it has one. */
  noHandle?: boolean
  /**
   * Doors and drawers only: what it's opened with. Absent means a handle or
   * knob, not yet chosen. Ignored when `noHandle` is set; `push` is for doors
   * (a drawer's is its runners, see `close`).
   */
  handle?: HandleType
  /**
   * Drawers only: runners that pull the drawer out all the way, rather than
   * standard ones that leave about a quarter of it inside. Absent means standard.
   */
  extension?: 'standard' | 'full'
  /**
   * Drawers only: runners that close the drawer gently (soft) or open it with
   * a push on the front, for fronts without handles (push). Absent means
   * ordinary runners.
   */
  close?: 'soft' | 'push'
  /**
   * Drawers only: the front covers the edges of the unit around the opening,
   * rather than sitting inside it (inset). Absent means inset.
   */
  overlay?: boolean
  /**
   * Boards only: the edges that get edge banding, when they aren't the ones
   * its kind usually has (see `autoBands`). Absent means the usual ones.
   */
  bands?: Edge[]
  /**
   * Boards and drawers (their front) only: the dimension the grain runs
   * along, when it isn't the usual one (see `autoGrain`). Only matters on a
   * board with grain. Absent means the usual one.
   */
  grain?: Dimension
  /** Hex colour (`#rrggbb`). Absent means the project's default colour. */
  color?: string
  /**
   * Where the part starts front to back: mm from its wall to its back face.
   * Absent means automatic (see `wallDepthStart`): against the back panel, or in
   * front of the unit for doors, drawer fronts, the plinth and trim.
   */
  z?: number
  /** Set on the panels a `Box` generates. They're rebuilt from the box, not edited alone. */
  boxId?: string
  /** The wall the part stands against. Absent means the back wall. */
  wall?: SideWall
}

/**
 * A carcass defined by its outside size: its sides, top, bottom and back are
 * worked out from it (see `boxPanels`) and rebuilt whenever it changes.
 * `x`/`y` is its bottom-left corner, like a piece's.
 */
export type Box = {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** Outside depth, back panel included. */
  depth: number
  /** Top and bottom fit between the sides, or sit on them and run full width. */
  joint: 'between' | 'on'
  /** The wall the box stands against; its panels share it. Absent means the back wall. */
  wall?: SideWall
  /** Where its back panel starts front to back, in mm from the wall; its panels all move with it. Absent means automatic. */
  z?: number
}

/** The walls of a room a unit can stand against, as seen from inside the room. */
export type Wall = 'left' | 'back' | 'right'
export type SideWall = Exclude<Wall, 'back'>

/**
 * The room the units stand in. The back wall is always used; switching on a
 * side wall makes an L-shaped (one side) or U-shaped (both) wardrobe. The size
 * is inside, in mm, and only matters once a side wall is on: it says where the
 * corners are.
 */
export type Room = {
  left: boolean
  right: boolean
  /** Along the back wall, corner to corner. */
  width: number
  /** Along the side walls, from the back wall out. */
  depth: number
  /** Floor to ceiling, inside, in mm. Absent means it isn't set. */
  height?: number
}
