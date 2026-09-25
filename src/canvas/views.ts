import type { Piece, Thickness } from '../types'

export type ViewName = 'front' | 'left' | 'right' | 'top' | 'back'

export const VIEWS: { name: ViewName; label: string }[] = [
  { name: 'front', label: 'Front' },
  { name: 'left', label: 'Left side' },
  { name: 'right', label: 'Right side' },
  { name: 'top', label: 'Top' },
  { name: 'back', label: 'Back' },
]

/**
 * Pieces as seen from one side, as flat rectangles in the same 2D space the
 * front view uses (x right, y up), ordered so nearer pieces draw on top. Only
 * the front view is edited; the others are read-only projections.
 *
 * Pieces don't store a front-to-back position yet, so every piece sits flush
 * against the back: the back panel takes the first `thickness.back` mm in
 * front of the wall (z = 0), and everything else starts right in front of it.
 */
export function projectPieces(pieces: Piece[], view: ViewName, thickness: Thickness): Piece[] {
  if (view === 'front') return pieces

  const hasBack = pieces.some((piece) => piece.kind === 'back')
  const zStart = (piece: Piece) => (piece.kind === 'back' || !hasBack ? 0 : thickness.back)

  switch (view) {
    // From the left: the wall on the left, the front of the unit on the right.
    // Pieces further left are nearer, so they draw last.
    case 'left':
      return [...pieces]
        .sort((a, b) => b.x - a.x)
        .map((piece) => ({ ...piece, x: zStart(piece), width: piece.depth }))
    // The mirror of that: the wall on the right, and pieces further right are
    // nearer. Where parts overlap, the two sides can show different things.
    case 'right':
      return [...pieces]
        .sort((a, b) => a.x + a.width - (b.x + b.width))
        .map((piece) => ({ ...piece, x: -(zStart(piece) + piece.depth), width: piece.depth }))
    // A plan: the wall along the top (y = 0), the unit's front towards the
    // bottom. Higher pieces are nearer, so they draw last.
    case 'top':
      return [...pieces]
        .sort((a, b) => a.y + a.height - (b.y + b.height))
        .map((piece) => ({
          ...piece,
          y: -(zStart(piece) + piece.depth),
          height: piece.depth,
        }))
    // From behind, so left and right swap. The back panel is nearest.
    case 'back':
      return [...pieces]
        .sort((a, b) => zStart(b) - zStart(a))
        .map((piece) => ({ ...piece, x: -(piece.x + piece.width) }))
  }
}

/** The size shown next to a selected piece, in the view's own terms. */
export function sizeLabel(piece: Piece, view: ViewName) {
  if (piece.kind === 'rod') {
    // End-on from the side a rod is just its round section.
    if (view === 'left' || view === 'right') return `⌀${piece.height}`
    return `⌀${Math.min(piece.width, piece.height)} × ${Math.max(piece.width, piece.height)}`
  }
  return `${piece.width} × ${piece.height}`
}

/**
 * The panels that cover the whole unit in a view (the back panel from the
 * front or back, the sides from either side, the top and bottom from above). They
 * are drawn see-through, or the view would show one solid panel.
 */
export function isHollow(piece: Piece, view: ViewName) {
  if (view === 'left' || view === 'right') return piece.kind === 'vertical'
  if (view === 'top') return piece.kind === 'horizontal'
  return piece.kind === 'back'
}
