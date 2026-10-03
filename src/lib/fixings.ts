import type { Piece } from '../types'
import { wallOf } from './room'

/**
 * Boards closer than this count as touching, in mm: positions are whole mm,
 * and a part placed by eye may be a mm off.
 */
const TOUCH = 1

/** Screws in a carcass joint: two in a narrow board (a rail), three across a deep one. */
const screwsPerJoint = (depth: number) => (depth < 300 ? 2 : 3)

/** How far apart the nails or screws round a back panel go, in mm. */
const BACK_FIXING_SPACING = 150

/** Boards that run across the unit, and the upright ones they're screwed to. */
const isAcross = (piece: Piece) => piece.kind === 'horizontal' || piece.kind === 'rail'
const isUpright = (piece: Piece) => piece.kind === 'vertical' || piece.kind === 'divider'

/** The two overlap along their shared edge, rather than only touching at a corner. */
const overlaps = (from1: number, to1: number, from2: number, to2: number) =>
  Math.min(to1, to2) - Math.max(from1, from2) > TOUCH

/**
 * Whether a board across the unit (a top, bottom or rail) is joined to an
 * upright one (a side or divider): its end against the upright's face, as
 * when it fits between the sides, or its face against the upright's end, as
 * when it sits on top of the sides or a divider stands on it.
 */
function joined(across: Piece, upright: Piece) {
  const endToFace =
    (Math.abs(across.x - (upright.x + upright.width)) <= TOUCH ||
      Math.abs(across.x + across.width - upright.x) <= TOUCH) &&
    overlaps(across.y, across.y + across.height, upright.y, upright.y + upright.height)
  const faceToEnd =
    (Math.abs(across.y - (upright.y + upright.height)) <= TOUCH ||
      Math.abs(across.y + across.height - upright.y) <= TOUCH) &&
    overlaps(across.x, across.x + across.width, upright.x, upright.x + upright.width)
  return endToFace || faceToEnd
}

/**
 * Screws joining the carcass: wherever a top, bottom or rail meets a side or
 * divider on the same wall, a few screws (by how deep the shallower of the
 * two is). Fixed shelves are counted on their own, and other parts hang on
 * these.
 */
export function carcassScrews(pieces: Piece[]) {
  const uprights = pieces.filter(isUpright)
  let screws = 0
  for (const across of pieces.filter(isAcross)) {
    for (const upright of uprights) {
      if (wallOf(upright) !== wallOf(across) || !joined(across, upright)) continue
      screws += screwsPerJoint(Math.min(across.depth, upright.depth))
    }
  }
  return screws
}

/** Nails or screws round every back panel's edge, about every 150 mm. */
export function backFixings(pieces: Piece[]) {
  return pieces
    .filter((piece) => piece.kind === 'back')
    .reduce(
      (sum, back) => sum + Math.ceil((2 * (back.width + back.height)) / BACK_FIXING_SPACING),
      0,
    )
}

/**
 * Whether a door or drawer has a handle or knob. Each has one unless it's
 * been taken off (`noHandle`), and a push-to-open drawer opens without one.
 */
export const hasHandle = (piece: Piece) =>
  (piece.kind === 'door' || piece.kind === 'drawer') &&
  !piece.noHandle &&
  !(piece.kind === 'drawer' && piece.close === 'push')

/** Handles or knobs to buy: one per door leaf (two for a double door) and per drawer that has one. */
export function handleCount(pieces: Piece[]) {
  return pieces
    .filter(hasHandle)
    .reduce((sum, piece) => sum + (piece.kind === 'door' && piece.double ? 2 : 1), 0)
}
