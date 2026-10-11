import type { Piece, Thickness } from '../types'
import { hasHandle } from './fixings'
import { wallDepthStart } from './geometry'
import { wallOf } from './room'

/** Room needed behind a hinged door for its hinges and its swing, in mm. */
export const HINGE_CLEARANCE = 20
/** Room needed behind a sliding door, in mm. */
export const SLIDING_CLEARANCE = 5
/** More room for a handle or knob on the drawer front, in mm. */
export const HANDLE_CLEARANCE = 25

type ClearanceWarning = {
  drawerId: string
  doorId: string
  /** Gap from the door's back face to the drawer's front, in mm; negative when the drawer pokes through. */
  gap: number
  /** The gap it needs. */
  needed: number
  /** Where the drawer's front should be, in mm from the wall, to have it. */
  front: number
}

/**
 * The drawers that sit too close behind a door, found for the drawer and for
 * its door (the same warning under both ids). A door is in front of a drawer
 * when it's on the same wall, covers most of its width and some of its
 * height, and starts at or ahead of where the drawer starts. The gap runs
 * from the door's back face to the drawer's front, and has to leave room for
 * the hinges (or a sliding door's track) and, on a drawer with a handle or
 * knob, the handle. The nearest door counts.
 */
export function clearanceWarnings(pieces: Piece[], thickness: Thickness): Map<string, ClearanceWarning> {
  const warnings = new Map<string, ClearanceWarning>()
  const zStart = wallDepthStart(pieces, thickness)
  const doors = pieces.filter((piece) => piece.kind === 'door')
  for (const drawer of pieces.filter((piece) => piece.kind === 'drawer')) {
    const front = zStart(drawer) + drawer.depth
    let nearest: { door: Piece; gap: number } | null = null
    for (const door of doors) {
      const across = Math.min(door.x + door.width, drawer.x + drawer.width) - Math.max(door.x, drawer.x)
      const up = Math.min(door.y + door.height, drawer.y + drawer.height) - Math.max(door.y, drawer.y)
      if (wallOf(door) !== wallOf(drawer) || across <= drawer.width / 2 || up <= 0) continue
      const back = zStart(door)
      if (back < zStart(drawer)) continue
      const gap = back - front
      if (!nearest || gap < nearest.gap) nearest = { door, gap }
    }
    if (!nearest) continue
    const needed = (nearest.door.sliding ? SLIDING_CLEARANCE : HINGE_CLEARANCE) + (hasHandle(drawer) ? HANDLE_CLEARANCE : 0)
    if (nearest.gap >= needed) continue
    const warning = {
      drawerId: drawer.id,
      doorId: nearest.door.id,
      gap: nearest.gap,
      needed,
      front: front + nearest.gap - needed,
    }
    warnings.set(drawer.id, warning)
    // A door in front of several drawers keeps the tightest.
    const existing = warnings.get(nearest.door.id)
    if (!existing || existing.gap > warning.gap) warnings.set(nearest.door.id, warning)
  }
  return warnings
}

/**
 * Where to put a drawer so its front has the room it needs: set back by the
 * missing gap, or, when that would go through the back panel, as far back as
 * it goes and shortened to end at the right place.
 */
export function setBack(drawer: Piece, warning: ClearanceWarning): { z: number; depth: number } {
  const z = warning.front - drawer.depth
  return z >= 0 ? { z, depth: drawer.depth } : { z: 0, depth: Math.max(1, warning.front) }
}
