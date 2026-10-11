import type { Piece } from '../types'

/** Drawing scales, as 1:n, in the order they're tried: the largest that fits wins. */
const SCALES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]

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
type Span = { from: number; to: number }

/** Gaps too small to label on a drawing: the slit between two drawer fronts, say. */
const MIN_LABELLED = 20

const isUpright = (piece: Piece) => piece.kind === 'vertical' || piece.kind === 'divider'
const isAcross = (piece: Piece) =>
  ['horizontal', 'shelf', 'rail', 'plinth', 'drawer'].includes(piece.kind)

/** A clear opening: across from `from` to `to`, at heights `bottom` to `top`. */
export type Opening = Span & { bottom: number; top: number }

/**
 * The clear openings between the sides and dividers of a front view, left to
 * right (then bottom to top): from one upright's inner face to the next one's,
 * at the heights where both stand and nothing stands between them. So a
 * divider above a shelf and another below it, at different places, make
 * openings of their own above and below, not one between the two dividers.
 * Uprights that overlap (stacked, or drawn over each other) don't make one.
 */
export function openings(pieces: Piece[]): Opening[] {
  const uprights = pieces.filter(isUpright).sort((a, b) => a.x - b.x)
  const found: Opening[] = []
  uprights.forEach((left, i) => {
    const from = left.x + left.width
    // The heights of `left` that nothing seen so far, going right, stands in front of.
    let free: Span[] = [{ from: left.y, to: left.y + left.height }]
    for (const right of uprights.slice(i + 1)) {
      const height = { from: right.y, to: right.y + right.height }
      if (right.x - from >= MIN_LABELLED) {
        for (const gap of free) {
          const bottom = Math.max(gap.from, height.from)
          const top = Math.min(gap.to, height.to)
          if (top - bottom >= MIN_LABELLED) found.push({ from, to: right.x, bottom, top })
        }
      }
      free = without(free, height)
      if (free.length === 0) break
    }
  })
  return found.sort((a, b) => a.from - b.from || a.bottom - b.bottom)
}

/** The parts of the spans in `spans` outside `cut`. */
function without(spans: Span[], cut: Span): Span[] {
  return spans.flatMap((span) =>
    [
      { from: span.from, to: Math.min(span.to, cut.from) },
      { from: Math.max(span.from, cut.to), to: span.to },
    ].filter((part) => part.to > part.from),
  )
}

/**
 * The clear heights inside an opening, bottom to top: the gaps between the
 * boards and drawers that run across it (tops, bottoms, shelves, rails,
 * plinths, drawer fronts), within the heights the opening has, plus the
 * board at each end of it. Gaps too thin to label are left out.
 */
export function openingHeights(pieces: Piece[], opening: Opening): Span[] {
  const across = pieces
    .filter(
      (piece) =>
        isAcross(piece) &&
        Math.min(piece.x + piece.width, opening.to) - Math.max(piece.x, opening.from) > 1 &&
        piece.y + piece.height >= opening.bottom - 1 &&
        piece.y <= opening.top + 1,
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
