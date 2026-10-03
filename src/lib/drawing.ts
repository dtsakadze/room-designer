import type { Piece } from '../types'

/** Drawing scales, as 1:n, in the order they're tried: the largest that fits wins. */
export const SCALES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]

/** Paper sizes, landscape, in mm. */
export const PAPER = {
  a4: { label: 'A4', width: 297, height: 210 },
  a3: { label: 'A3', width: 420, height: 297 },
} as const
export type PaperSize = keyof typeof PAPER

/**
 * The scale to draw something of this size at, in design mm, so it fits an
 * area of paper (in mm) with room left round it for dimension lines: the
 * largest standard scale that fits, or the smallest one there is.
 */
export function fitScale(size: { width: number; height: number }, area: { width: number; height: number }, margin: number) {
  return (
    SCALES.find(
      (n) => size.width / n + 2 * margin <= area.width && size.height / n + 2 * margin <= area.height,
    ) ?? SCALES[SCALES.length - 1]
  )
}

/** A dimension: a measured span along x or y, in design mm. */
export type Span = { from: number; to: number }

/** Gaps too small to label on a drawing: the slit between two drawer fronts, say. */
const MIN_LABELLED = 20

const isUpright = (piece: Piece) => piece.kind === 'vertical' || piece.kind === 'divider'
const isAcross = (piece: Piece) =>
  ['horizontal', 'shelf', 'rail', 'plinth', 'drawer'].includes(piece.kind)

/**
 * The clear openings between the sides and dividers of a front view, left to
 * right: from one upright's inner face to the next one's. Uprights that
 * overlap (stacked, or drawn over each other) don't make an opening.
 */
export function openings(pieces: Piece[]): Span[] {
  const uprights = pieces.filter(isUpright).sort((a, b) => a.x - b.x)
  const spans: Span[] = []
  for (let i = 1; i < uprights.length; i++) {
    const from = uprights[i - 1].x + uprights[i - 1].width
    const to = uprights[i].x
    if (to - from >= MIN_LABELLED) spans.push({ from, to })
  }
  return spans
}

/**
 * The clear heights inside an opening, bottom to top: the gaps between the
 * boards and drawers that run across it (tops, bottoms, shelves, rails,
 * plinths, drawer fronts). Gaps too thin to label are left out.
 */
export function openingHeights(pieces: Piece[], opening: Span): Span[] {
  const across = pieces
    .filter(
      (piece) =>
        isAcross(piece) &&
        Math.min(piece.x + piece.width, opening.to) - Math.max(piece.x, opening.from) > 1,
    )
    .sort((a, b) => a.y - b.y)
  const spans: Span[] = []
  for (let i = 1; i < across.length; i++) {
    const from = across[i - 1].y + across[i - 1].height
    const to = across[i].y
    if (to - from >= MIN_LABELLED) spans.push({ from, to })
  }
  return spans
}
