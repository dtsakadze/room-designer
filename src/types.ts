export type PieceKind =
  | 'vertical'
  | 'horizontal'
  | 'back'
  | 'shelf'
  | 'divider'
  | 'rod'
  | 'drawer'
  | 'plinth'

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
}
