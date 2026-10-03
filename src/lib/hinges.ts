import type { Piece, Thickness } from '../types'
import { DOOR_OPEN_ANGLE } from './defaults'
import { doorLeaves } from './geometry'
import { wallOf } from './room'

/**
 * How a cup hinge's arm is cranked, which depends on where the door sits:
 * covering the whole side panel (full overlay), sharing the panel with a door
 * on its other side (half overlay), or inside the opening (inset). Hinges are
 * bought by this.
 */
export type HingeFit = 'full' | 'half' | 'inset'

/** The order hinge kinds are listed in. */
export const HINGE_FITS: HingeFit[] = ['full', 'half', 'inset']

export const HINGE_FIT_LABELS: Record<HingeFit, string> = {
  full: 'full overlay',
  half: 'half overlay',
  inset: 'inset',
}

/**
 * Hinges a door leaf needs for its height, as hinge makers recommend: two up
 * to 900 mm, three up to 1600, four up to 2000, five above.
 */
export function hingesPerLeaf(height: number) {
  if (height <= 900) return 2
  if (height <= 1600) return 3
  if (height <= 2000) return 4
  return 5
}

/** One leaf's hinges: how many, and which kind. */
export type LeafHinges = {
  doorId: string
  count: number
  fit: HingeFit
  angle: number
  softClose: boolean
}

/** A leaf's hinged edge: where it is along the wall, and which way the leaf opens from it. */
type HingedEdge = { door: Piece; x: number; side: 'left' | 'right' }

/**
 * The hinges of every door leaf. A single door is hinged on its hinge side,
 * each leaf of a double door on its outer side. An overlay leaf is half
 * overlay when another overlay leaf on the same wall, at the same height, is
 * hinged on the same panel from the other side (their hinged edges are less
 * than a body board apart); otherwise full overlay.
 */
export function doorHinges(pieces: Piece[], thickness: Thickness): LeafHinges[] {
  const doors = pieces.filter((piece) => piece.kind === 'door')
  const edges: HingedEdge[] = doors.flatMap((door) =>
    doorLeaves(door, door.double).map((leaf, index) => {
      const side = door.double ? (index === 0 ? 'left' : 'right') : (door.hinge ?? 'left')
      return { door, side, x: side === 'left' ? leaf.x : leaf.x + leaf.width }
    }),
  )

  const sharesPanel = (edge: HingedEdge) =>
    edges.some(
      (other) =>
        other.door !== edge.door &&
        !other.door.inset &&
        other.side !== edge.side &&
        wallOf(other.door) === wallOf(edge.door) &&
        other.door.y < edge.door.y + edge.door.height &&
        edge.door.y < other.door.y + other.door.height &&
        Math.abs(other.x - edge.x) <= thickness.body,
    )

  return edges.map((edge) => ({
    doorId: edge.door.id,
    count: hingesPerLeaf(edge.door.height),
    fit: edge.door.inset ? 'inset' : sharesPanel(edge) ? 'half' : 'full',
    angle: edge.door.openAngle ?? DOOR_OPEN_ANGLE,
    softClose: !!edge.door.softClose,
  }))
}
