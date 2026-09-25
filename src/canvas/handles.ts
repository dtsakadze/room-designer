import type { Piece } from '../types'

/** The part of a piece (or a box) that handles resize. */
export type Rect = Pick<Piece, 'x' | 'y' | 'width' | 'height'>

/**
 * A handle is identified by which edges it drags: -1 is the left/bottom edge,
 * 1 the right/top edge, 0 means that axis stays put.
 */
export type Handle = { hx: -1 | 0 | 1; hy: -1 | 0 | 1 }

export const HANDLES: Handle[] = [
  { hx: -1, hy: 1 },
  { hx: 0, hy: 1 },
  { hx: 1, hy: 1 },
  { hx: -1, hy: 0 },
  { hx: 1, hy: 0 },
  { hx: -1, hy: -1 },
  { hx: 0, hy: -1 },
  { hx: 1, hy: -1 },
]

/** Stops a piece being dragged inside out. */
export const MIN_SIZE = 10

/** Handle box size, in screen-constant units. */
export const HANDLE_SIZE = 11
/** Minimum spread between the three handles on an axis, as handle boxes. */
const SPREAD = 2.6

/**
 * An 18mm board is thinner than the handles themselves, so on a short axis the
 * outer handles sit just outside the piece rather than on top of each other.
 */
export function handleOutsets(piece: Rect, box: number) {
  return {
    x: Math.max(0, (box * SPREAD - piece.width) / 2),
    y: Math.max(0, (box * SPREAD - piece.height) / 2),
  }
}

export const handleKey = (handle: Handle) => `${handle.hx}:${handle.hy}`

export function handleCursor({ hx, hy }: Handle) {
  if (hx === 0) return 'ns-resize'
  if (hy === 0) return 'ew-resize'
  return hx === hy ? 'nesw-resize' : 'nwse-resize'
}

/**
 * Resize by dragging one handle: the edges it owns follow the pointer, the
 * opposite edges stay where they are. `dx`/`dy` are in design coordinates.
 */
export function resizePiece(
  origin: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  snap: (mm: number) => number,
): Rect {
  const left = origin.x
  const right = origin.x + origin.width
  const bottom = origin.y
  const top = origin.y + origin.height

  let { x, y, width, height } = origin

  if (handle.hx === -1) {
    x = Math.min(snap(left + dx), right - MIN_SIZE)
    width = right - x
  } else if (handle.hx === 1) {
    width = Math.max(snap(right + dx), left + MIN_SIZE) - left
  }

  if (handle.hy === -1) {
    // The floor is a hard stop, so the bottom edge never goes negative.
    y = Math.min(Math.max(0, snap(bottom + dy)), top - MIN_SIZE)
    height = top - y
  } else if (handle.hy === 1) {
    height = Math.max(snap(top + dy), bottom + MIN_SIZE) - bottom
  }

  return { x, y, width, height }
}
