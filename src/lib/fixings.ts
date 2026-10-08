import type { JointType, Piece } from '../types'
import { doorLeaves, slidingPanels } from './geometry'
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
  return carcassJoints(pieces).reduce((sum, depth) => sum + screwsPerJoint(depth), 0)
}

/** The depth of every carcass joint (the shallower of the two boards), as `carcassScrews` finds them. */
function carcassJoints(pieces: Piece[]) {
  const uprights = pieces.filter(isUpright)
  const joints: number[] = []
  for (const across of pieces.filter(isAcross)) {
    for (const upright of uprights) {
      if (wallOf(upright) !== wallOf(across) || !joined(across, upright)) continue
      joints.push(Math.min(across.depth, upright.depth))
    }
  }
  return joints
}

/** Screws a fixed shelf needs: two through each side, near its front and back edges, so it holds the sides straight. */
const SCREWS_PER_FIXED_SHELF = 4

/** Cam locks in a joint: one in a narrow board, two across a deep one; each has a bolt. */
const camsPerJoint = (depth: number) => (depth < 300 ? 1 : 2)

/** Dowels beside each cam lock, so the boards can't twist. */
const DOWELS_PER_CAM = 2

/** The row of hardware a joint count turns into, `quantity` of it. */
type JointRow = {
  item: 'carcass-screws' | 'shelf-screws' | 'confirmat-screws' | 'cam-locks' | 'cam-bolts' | 'dowels'
  quantity: number
}

/**
 * What joins the boards of the carcass: screws, confirmat screws, or cam
 * locks with bolts and dowels, in the numbers that go with the same joints
 * (tops, bottoms and rails to sides and dividers, and each fixed shelf to the
 * sides it sits between). Typical figures, not exact: shops and boards differ.
 */
export function jointHardware(pieces: Piece[], joints: JointType): JointRow[] {
  const carcass = carcassJoints(pieces)
  // A fixed shelf is joined to a side at each end.
  const shelves = pieces.filter((piece) => piece.kind === 'shelf' && piece.fixed)
  const shelfJoints = shelves.flatMap((shelf) => [shelf.depth, shelf.depth])
  switch (joints) {
    case 'screws':
      return [
        { item: 'shelf-screws', quantity: shelves.length * SCREWS_PER_FIXED_SHELF },
        { item: 'carcass-screws', quantity: carcassScrews(pieces) },
      ]
    case 'confirmat':
      return [
        {
          item: 'confirmat-screws',
          quantity: carcassScrews(pieces) + shelves.length * SCREWS_PER_FIXED_SHELF,
        },
      ]
    case 'cam': {
      const cams = [...carcass, ...shelfJoints].reduce((sum, depth) => sum + camsPerJoint(depth), 0)
      return [
        { item: 'cam-locks', quantity: cams },
        { item: 'cam-bolts', quantity: cams },
        { item: 'dowels', quantity: cams * DOWELS_PER_CAM },
      ]
    }
  }
}

/** Units taller than this, in mm, should be fixed to the wall so they can't tip over. */
export const TIP_HEIGHT = 700

/** Anti-tip brackets per unit, at the top, one near each side. */
const BRACKETS_PER_UNIT = 2

/**
 * How many units need fixing to the wall: each top board of a carcass (a
 * board across the unit whose top is level with, or above, the sides it's
 * joined to) that's higher than `TIP_HEIGHT`. A box is one unit, and so is
 * each separate carcass built from loose panels. Shelves and bottoms further
 * down a unit aren't tops.
 */
export function tippingUnits(pieces: Piece[]) {
  const uprights = pieces.filter(isUpright)
  return pieces.filter(
    (across) =>
      across.kind === 'horizontal' &&
      across.y + across.height > TIP_HEIGHT &&
      uprights.some(
        (upright) =>
          wallOf(upright) === wallOf(across) &&
          joined(across, upright) &&
          across.y + across.height >= upright.y + upright.height - TOUCH,
      ),
  ).length
}

/** Brackets, and so wall anchors, for a design: two for every unit that could tip. */
export const antiTipBrackets = (pieces: Piece[]) => tippingUnits(pieces) * BRACKETS_PER_UNIT

/** Nails or screws round every back panel's edge, about every 150 mm. */
export function backFixings(pieces: Piece[]) {
  return pieces
    .filter((piece) => piece.kind === 'back')
    .reduce(
      (sum, back) => sum + Math.ceil((2 * (back.width + back.height)) / BACK_FIXING_SPACING),
      0,
    )
}

/** What a door or drawer front is opened with, as the hardware list tells them apart. */
type Opener = 'handle' | 'bar' | 'knob' | 'profile' | 'push'

/**
 * What a door or drawer is opened with, or null for nothing: it's been taken
 * off (`noHandle`), or it's a push-to-open drawer (its runners open it).
 * Without a choice it's a handle or knob.
 */
function openerOf(piece: Piece): Opener | null {
  if (piece.kind === 'door') return piece.noHandle ? null : (piece.handle ?? 'handle')
  if (piece.kind === 'drawer') {
    return piece.noHandle || piece.close === 'push' ? null : (piece.handle ?? 'handle')
  }
  return null
}

/** Whether a door or drawer has a handle or knob (of any kind), rather than a grip, a latch or nothing. */
export const hasHandle = (piece: Piece) => {
  const opener = openerOf(piece)
  return opener === 'handle' || opener === 'bar' || opener === 'knob'
}

/** The fronts a door or drawer is made of, each opened by its own handle: a double door's leaves, sliding panels. */
function fronts(piece: Piece): { width: number; height: number }[] {
  if (piece.kind === 'door' && piece.sliding) return slidingPanels({ ...piece, sliding: piece.sliding })
  if (piece.kind === 'door' && piece.double) return doorLeaves(piece, true)
  return [piece]
}

/** Handles or knobs to buy: one per door leaf (two for a double door, one per panel for sliding ones) and per drawer that has one. */
export function handleCount(pieces: Piece[]) {
  return pieces.filter(hasHandle).reduce((sum, piece) => sum + fronts(piece).length, 0)
}

type OpenerRow =
  | { item: 'handles' | 'bar-handles' | 'knobs' | 'push-latches'; quantity: number }
  | { item: 'j-profile'; length: number; quantity: number }

/**
 * What to buy to open doors and drawers, by what each is opened with: a
 * handle or knob (not chosen), bar handles, knobs, push-to-open latches, and
 * J-profile cut to length for each front (along its top edge, or down a
 * sliding panel's edge).
 */
export function openerHardware(pieces: Piece[]): OpenerRow[] {
  const counts = { handle: 0, bar: 0, knob: 0, push: 0 }
  const profiles: number[] = []
  for (const piece of pieces) {
    const opener = openerOf(piece)
    if (!opener) continue
    const leaves = fronts(piece)
    if (opener === 'profile') {
      for (const leaf of leaves) profiles.push(Math.round(piece.sliding ? leaf.height : leaf.width))
    } else counts[opener] += leaves.length
  }
  return [
    { item: 'handles', quantity: counts.handle },
    { item: 'bar-handles', quantity: counts.bar },
    { item: 'knobs', quantity: counts.knob },
    { item: 'push-latches', quantity: counts.push },
    ...profiles.map((length): OpenerRow => ({ item: 'j-profile', length, quantity: 1 })),
  ]
}
