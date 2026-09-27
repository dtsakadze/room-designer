import type { Piece, Room, SideWall, Wall } from '../types'

/**
 * Walls and rooms. Each wall is designed in its own front view, with the same
 * convention as a single unit: x = 0 is the middle of that wall, y up from the
 * floor, z out of the wall towards you. The room joins them up:
 *
 * - Room coordinates: X right and Z out of the back wall (as in the 3D view),
 *   Y up. The back wall runs along Z = 0 from X = -width/2 to width/2, and the
 *   side walls stand at X = ∓width/2, from Z = 0 to Z = depth.
 * - The back wall's own coordinates are the room's, so a one-wall project is
 *   placed exactly as before rooms existed.
 * - Facing the left wall, the back corner is on your right; facing the right
 *   wall, it's on your left.
 */

export const DEFAULT_ROOM: Room = { left: false, right: false, width: 2400, depth: 1800 }
export const MIN_ROOM_SIZE = 500
export const MAX_ROOM_SIZE = 20000

/** In the order they're seen in a plan, left to right. */
export const WALLS: Wall[] = ['left', 'back', 'right']

export const WALL_LABELS: Record<Wall, string> = {
  left: 'Left wall',
  back: 'Back wall',
  right: 'Right wall',
}

/** The room's walls in one word: one wall, or an L or U round the room. */
export type Layout = 'one' | 'l' | 'u'

export const LAYOUT_LABELS: Record<Layout, string> = {
  one: 'One wall',
  l: 'L-shape',
  u: 'U-shape',
}

export const layoutOf = (room: Room): Layout =>
  room.left && room.right ? 'u' : room.left || room.right ? 'l' : 'one'

export const clampRoomSize = (mm: number) =>
  Math.min(MAX_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, Math.round(mm) || MIN_ROOM_SIZE))

export const isSideWall = (value: unknown): value is SideWall =>
  value === 'left' || value === 'right'

export const wallOf = (item: { wall?: SideWall }): Wall => item.wall ?? 'back'

/** The walls in use, in plan order. The back wall always is. */
export const activeWalls = (room: Room) => WALLS.filter((wall) => wall === 'back' || room[wall])

/** Whether the room has more than the back wall: an L or a U. */
export const hasSideWalls = (room: Room) => room.left || room.right

/** Corner to corner, along the wall. */
export const wallLength = (room: Room, wall: Wall) => (wall === 'back' ? room.width : room.depth)

/**
 * The walls that share a corner with this one. The two side walls face each
 * other across the room, so they don't.
 */
export const adjacentWalls = (wall: Wall, room: Room): Wall[] =>
  wall === 'back' ? activeWalls(room).filter((other) => other !== 'back') : ['back']

/** A 3D box in room coordinates, in mm. */
export type RoomBox = { min: [number, number, number]; max: [number, number, number] }

/**
 * Where a piece is in the room, given where it starts front to back (`z`, from
 * `wallDepthStart`). Walls only turn by right angles, so the box stays aligned
 * with the room's axes.
 */
export function roomBox(piece: Piece, z: number, room: Room): RoomBox {
  const [x0, x1] = [piece.x, piece.x + piece.width]
  const [y0, y1] = [piece.y, piece.y + piece.height]
  const [z0, z1] = [z, z + piece.depth]
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  switch (wallOf(piece)) {
    case 'back':
      return { min: [x0, y0, z0], max: [x1, y1, z1] }
    case 'left':
      return { min: [-halfWidth + z0, y0, halfDepth - x1], max: [-halfWidth + z1, y1, halfDepth - x0] }
    case 'right':
      return { min: [halfWidth - z1, y0, halfDepth + x0], max: [halfWidth - z0, y1, halfDepth + x1] }
  }
}

/**
 * A box in the room as it appears in one wall's front view: a rectangle in
 * that wall's x and y, and how far out from that wall its nearest side is.
 * Used to show the neighbouring walls' parts in a corner.
 */
export function fromWall(box: RoomBox, wall: Wall, room: Room) {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const distance =
    wall === 'back'
      ? box.min[2]
      : wall === 'left'
        ? box.min[0] + halfWidth
        : halfWidth - box.max[0]
  const [x0, x1] =
    wall === 'back'
      ? [box.min[0], box.max[0]]
      : wall === 'left'
        ? [halfDepth - box.max[2], halfDepth - box.min[2]]
        : [box.min[2] - halfDepth, box.max[2] - halfDepth]
  return { x: x0, y: box.min[1], width: x1 - x0, height: box.max[1] - box.min[1], distance }
}

/**
 * Every wall's pieces laid out side by side (left, back, right) as if the room
 * were unfolded flat, for a small picture of the whole design.
 */
export function unfold(pieces: Piece[], room: Room): Piece[] {
  if (!hasSideWalls(room)) return pieces
  const shift = room.width / 2 + room.depth / 2
  return pieces.map((piece) => {
    const wall = wallOf(piece)
    if (wall === 'back') return piece
    return { ...piece, x: piece.x + (wall === 'left' ? -shift : shift) }
  })
}
