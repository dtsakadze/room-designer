import type { Piece, Room, Thickness } from '../types'
import { footprint, wallDepthStart } from './geometry'
import { hasSideWalls } from './room'

/** Overlaps smaller than this are rounding, not a part in the wall, in mm. */
const TOLERANCE = 1

/** What a part sticks out past: a side of the room, or the ceiling. */
export type Overhang = { past: 'left' | 'right' | 'back' | 'front' | 'ceiling'; by: number }

/**
 * The parts that stick out of the room, by part id, with the worst way if
 * there are several. In a room with side walls (an L or a U) the room is the
 * rectangle its width and depth make, with the back wall along the back, so a
 * part past either side or the back, or past the front end of the side walls,
 * is outside it, whether or not there's a wall on that side (the drawing
 * shows the walls' ends on both sides). A one-wall project has no room size
 * to speak of, so it's only warned about a ceiling, once its height is set.
 */
export function roomOverhangs(pieces: Piece[], thickness: Thickness, room: Room): Map<string, Overhang> {
  const found = new Map<string, Overhang>()
  const zStart = wallDepthStart(pieces, thickness)
  const halfWidth = room.width / 2
  for (const piece of pieces) {
    const { min, max } = footprint(piece, zStart(piece), room)
    const candidates: Overhang[] = [
      ...(hasSideWalls(room)
        ? [
            { past: 'left' as const, by: -halfWidth - min[0] },
            { past: 'right' as const, by: max[0] - halfWidth },
            { past: 'back' as const, by: -min[2] },
            { past: 'front' as const, by: max[2] - room.depth },
          ]
        : []),
      ...(room.height ? [{ past: 'ceiling' as const, by: max[1] - room.height }] : []),
    ].filter((overhang) => overhang.by > TOLERANCE)
    if (candidates.length === 0) continue
    found.set(
      piece.id,
      candidates.reduce((worst, next) => (next.by > worst.by ? next : worst)),
    )
  }
  return found
}
