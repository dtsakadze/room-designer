import type { Piece } from '../types'
import { wallOf } from './room'

/** The usual spacing of the holes shelf pins go in ("System 32"), in mm. */
export const DEFAULT_HOLE_PITCH = 32
export const MIN_HOLE_PITCH = 8
export const MAX_HOLE_PITCH = 100

/**
 * How far the hole columns are from a panel's front and back edges: 37 mm,
 * the usual setback for drilling ("System 32"), so pins sit near the
 * shelf's corners.
 */
export const HOLE_SETBACK = 37

/** Pins an adjustable shelf rests on: one at each corner. */
export const PINS_PER_SHELF = 4

/**
 * How far a shelf's end may be from a panel's face for the shelf to count as
 * resting on that panel's holes. Shelves are often cut a little short so
 * they slide in, and the drawing may not be exact.
 */
const REACH = 20

export const clampHolePitch = (mm: number) =>
  Math.min(MAX_HOLE_PITCH, Math.max(MIN_HOLE_PITCH, Math.round(mm) || DEFAULT_HOLE_PITCH))

/** A shelf that rests on pins rather than being screwed in. */
export const isAdjustable = (piece: Piece) => piece.kind === 'shelf' && !piece.fixed

/** Panels drilled for shelf pins: sides and dividers. */
const isDrilled = (piece: Piece) => piece.kind === 'vertical' || piece.kind === 'divider'

/** Whether a panel stands at a shelf's height, so the shelf can rest on its holes. */
const reaches = (panel: Piece, shelf: Piece) => panel.y <= shelf.y && shelf.y < panel.y + panel.height

/**
 * The panels either side of a shelf whose holes it rests on, on its own wall:
 * the side or divider whose face its left end meets, and the one its right
 * end meets. Where several do (panels stacked above each other), the one
 * reaching the shelf's height wins. A panel only reaching some other height
 * counts only when neither side reaches the shelf's (a shelf dragged above
 * the unit still finds a top hole), so a short divider below a shelf that
 * the full-height side opposite holds doesn't pull it down to its holes.
 */
export function shelfPanels(shelf: Piece, pieces: Piece[]) {
  const wall = wallOf(shelf)
  const drilled = pieces.filter(
    (piece) => piece.id !== shelf.id && isDrilled(piece) && wallOf(piece) === wall,
  )
  const best = (candidates: Piece[]) => candidates.find((p) => reaches(p, shelf)) ?? candidates[0] ?? null
  const left = best(drilled.filter((p) => Math.abs(p.x + p.width - shelf.x) <= REACH))
  const right = best(drilled.filter((p) => Math.abs(p.x - (shelf.x + shelf.width)) <= REACH))
  const leftReaches = !!left && reaches(left, shelf)
  const rightReaches = !!right && reaches(right, shelf)
  if (leftReaches === rightReaches) return { left, right }
  return { left: leftReaches ? left : null, right: rightReaches ? right : null }
}

/**
 * The heights of a panel's holes: every `pitch` up from its bottom edge,
 * starting one pitch up, up to a pitch below its top.
 */
export function holeHeights(panel: Pick<Piece, 'y' | 'height'>, pitch: number) {
  const heights: number[] = []
  for (let y = panel.y + pitch; y <= panel.y + panel.height - pitch; y += pitch) heights.push(y)
  return heights
}

/**
 * The height an adjustable shelf goes to, given where it was asked to go: the
 * nearest hole of the panel it rests on (the left one, or the right one if
 * there's none on the left). Its underside sits on the pins. With no drilled
 * panel next to it, holes are counted up from the floor.
 */
export function snapToHoles(shelf: Piece, pieces: Piece[], pitch: number) {
  const { left, right } = shelfPanels(shelf, pieces)
  const panel = left ?? right
  if (!panel) return Math.max(0, Math.round(shelf.y / pitch) * pitch)
  const holes = holeHeights(panel, pitch)
  if (holes.length === 0) return shelf.y
  return holes.reduce((nearest, y) =>
    Math.abs(y - shelf.y) < Math.abs(nearest - shelf.y) ? y : nearest,
  )
}

/**
 * Where to draw hole lines: each side or divider an adjustable shelf rests
 * on, the face its holes are drilled in (towards the shelf), and its hole
 * heights. A panel with shelves on both sides is drilled on both faces.
 */
export function holeLines(pieces: Piece[], pitch: number) {
  const lines = new Map<string, { panel: Piece; face: 'left' | 'right'; heights: number[] }>()
  for (const shelf of pieces.filter(isAdjustable)) {
    const { left, right } = shelfPanels(shelf, pieces)
    // The left panel is drilled on its right face, the one the shelf meets.
    if (left) lines.set(`${left.id}|right`, { panel: left, face: 'right', heights: holeHeights(left, pitch) })
    if (right) lines.set(`${right.id}|left`, { panel: right, face: 'left', heights: holeHeights(right, pitch) })
  }
  return [...lines.values()]
}

/**
 * Where a panel's two columns of holes are across its depth, measured from
 * its back edge: a setback in from the front and the back. A panel too
 * shallow for two has one column, in the middle.
 */
export function holeColumns(depth: number) {
  if (depth < 3 * HOLE_SETBACK) return [depth / 2]
  return [HOLE_SETBACK, depth - HOLE_SETBACK]
}
