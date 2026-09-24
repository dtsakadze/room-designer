import type { Piece, Thickness } from '../types'
import { BOARD } from './defaults'

/**
 * Keeps a piece a sane size and stops it sinking through the floor. A board's
 * thickness is always reset to the project thickness, so it can't drift.
 */
export function normalizePiece(piece: Piece, thickness: Thickness): Piece {
  const height = atLeast(piece.height)
  const normalized = {
    ...piece,
    width: atLeast(piece.width),
    height,
    // A rod is round, so its height and depth are one number: the diameter.
    depth: piece.kind === 'rod' ? height : atLeast(piece.depth),
    x: round(piece.x),
    y: Math.max(0, round(piece.y)),
  }
  const board = BOARD[piece.kind]
  if (board) normalized[board.axis] = atLeast(thickness[board.board])
  return normalized
}

/** Bounding box of everything placed so far, in mm. */
export function contentBounds(pieces: Piece[]) {
  if (pieces.length === 0) return null
  return pieces.reduce(
    (bounds, piece) => ({
      minX: Math.min(bounds.minX, piece.x),
      maxX: Math.max(bounds.maxX, piece.x + piece.width),
      minY: Math.min(bounds.minY, piece.y),
      maxY: Math.max(bounds.maxY, piece.y + piece.height),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
}

const round = (value: number) => (Number.isNaN(value) ? 0 : Math.round(value))
const atLeast = (value: number, min = 1) => Math.max(min, round(value))

/**
 * A measured gap in the front view: from `from` to `to` along `axis`, drawn at
 * `at` on the other axis. All in design mm.
 */
export type Gap = { axis: 'x' | 'y'; from: number; to: number; at: number }

/**
 * The clear distances from a piece to whatever it faces on each side, and to
 * the floor below where nothing is in between. Each side is scanned along its
 * whole edge, so a shelf with a divider standing on it gets the height of the
 * opening on both sides of the divider, not just the divider it touches. Parts
 * that touch (no gap) show nothing. The back panel sits behind everything, so
 * it's never in the way.
 */
export function neighbourGaps(piece: Piece, pieces: Piece[]): Gap[] {
  const box = edges(piece)
  const others = pieces
    .filter((other) => other.id !== piece.id && other.kind !== 'back')
    .map(edges)
    .filter((other) => !overlaps(box, other))

  return [
    ...sideGaps(box, others, 'up'),
    ...sideGaps(box, others, 'down'),
    ...sideGaps(box, others, 'left'),
    ...sideGaps(box, others, 'right'),
  ]
}

type Side = 'up' | 'down' | 'left' | 'right'

function sideGaps(box: Edges, others: Edges[], side: Side): Gap[] {
  const vertical = side === 'up' || side === 'down'
  // Along the edge being scanned, and across it towards the neighbours.
  const [start, end] = vertical ? [box.left, box.right] : [box.bottom, box.top]
  const span = (o: Edges) => (vertical ? [o.left, o.right] : [o.bottom, o.top])
  const edge = { up: box.top, down: box.bottom, left: box.left, right: box.right }[side]
  const facing = (o: Edges) => ({ up: o.bottom, down: o.top, left: o.right, right: o.left })[side]
  const ahead = (o: Edges) =>
    side === 'up' || side === 'right' ? facing(o) >= edge : facing(o) <= edge
  const distance = (o: Edges) => Math.abs(facing(o) - edge)

  const candidates = others.filter((o) => {
    const [a, b] = span(o)
    return a < end && b > start && ahead(o)
  })

  // Cut the edge wherever a candidate starts or stops; each piece in between
  // faces one nearest neighbour (or nothing).
  const cuts = [start, end, ...candidates.flatMap(span)]
    .filter((v) => v >= start && v <= end)
    .sort((a, b) => a - b)

  const runs: { from: number; to: number; target: Edges | null }[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const [from, to] = [cuts[i], cuts[i + 1]]
    if (to <= from) continue
    const mid = (from + to) / 2
    const target = candidates
      .filter((o) => {
        const [a, b] = span(o)
        return a < mid && b > mid
      })
      .reduce<Edges | null>((best, o) => (!best || distance(o) < distance(best) ? o : best), null)
    const last = runs[runs.length - 1]
    if (last && last.target === target && last.to === from) last.to = to
    else runs.push({ from, to, target })
  }

  return runs.flatMap(({ from, to, target }) => {
    // Nothing below: measure to the floor. Nothing elsewhere: no line.
    const far = target ? facing(target) : side === 'down' ? 0 : null
    if (far === null || far === edge) return []
    const at = (from + to) / 2
    const [a, b] = [Math.min(edge, far), Math.max(edge, far)]
    return [{ axis: vertical ? ('y' as const) : ('x' as const), from: a, to: b, at }]
  })
}

type Edges = { left: number; right: number; bottom: number; top: number }

const edges = (piece: Piece): Edges => ({
  left: piece.x,
  right: piece.x + piece.width,
  bottom: piece.y,
  top: piece.y + piece.height,
})

const overlaps = (a: Edges, b: Edges) =>
  a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom
