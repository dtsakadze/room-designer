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

/**
 * One board, seen head-on. Everything lives in a single 2D world measured in
 * mm: `x`/`y` is the piece's bottom-left corner, y counts UP from the floor,
 * and x = 0 is the middle of the drawing.
 *
 * `depth` is carried for real-world completeness (cut lists later) but is not
 * drawn in this elevation view.
 */
/**
 * Board thicknesses for the whole project, in mm. Every board piece takes its
 * thickness from here rather than storing its own, so changing one number
 * updates every panel of that kind.
 */
export type Thickness = {
  body: number
  back: number
}

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
  /** Hex colour (`#rrggbb`). Absent means the project's default colour. */
  color?: string
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
}
