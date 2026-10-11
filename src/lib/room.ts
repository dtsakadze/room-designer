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
/** Where a ceiling starts when it's switched on, in mm. */
export const DEFAULT_CEILING_HEIGHT = 2400
const MIN_ROOM_SIZE = 500
const MAX_ROOM_SIZE = 20000

/** In the order they're seen in a plan, left to right. */
const WALLS: Wall[] = ['left', 'back', 'right']

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

/** The side walls a layout has: both for a U, the `corner` one for an L, none for one wall. */
export const layoutWalls = (layout: Layout, corner: SideWall): Pick<Room, 'left' | 'right'> =>
  layout === 'u'
    ? { left: true, right: true }
    : layout === 'l'
      ? { left: corner === 'left', right: corner === 'right' }
      : { left: false, right: false }

/** The side walls a change to the room switches off. */
export const wallsSwitchedOff = (room: Room, next: Pick<Room, 'left' | 'right'>): SideWall[] =>
  (['left', 'right'] as const).filter((wall) => room[wall] && !next[wall])

export const clampRoomSize = (mm: number) =>
  Math.min(MAX_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, Math.round(mm) || MIN_ROOM_SIZE))

export const isSideWall = (value: unknown): value is SideWall =>
  value === 'left' || value === 'right'

export const wallOf = (item: { wall?: SideWall }): Wall => item.wall ?? 'back'

/** The walls in use, in plan order. The back wall always is. */
export const activeWalls = (room: Room) => WALLS.filter((wall) => wall === 'back' || room[wall])

/**
 * The parts of each wall that has any, in plan order, with the wall's name:
 * what to build and carry one run at a time. Walls with nothing on them are
 * left out.
 */
export function wallRuns(pieces: Piece[], room: Room): { wall: Wall; label: string; pieces: Piece[] }[] {
  return activeWalls(room)
    .map((wall) => ({ wall, label: WALL_LABELS[wall], pieces: pieces.filter((piece) => wallOf(piece) === wall) }))
    .filter((run) => run.pieces.length > 0)
}

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

/** A direction or a point on the floor plan: the room's x and z. */
type PlanVector = [x: number, z: number]

/**
 * How each wall's own coordinates turn into the room's: `along` the wall
 * (its front view's x) and `out` from it into the room, each a direction in
 * the room's x and z, from `origin` (the wall's middle, at its face). Walls
 * only turn by right angles, so the room's axes stay lined up with them.
 */
export const WALL_FRAMES: Record<Wall, { along: PlanVector; out: PlanVector; origin: (room: Room) => PlanVector }> = {
  back: { along: [1, 0], out: [0, 1], origin: () => [0, 0] },
  left: { along: [0, -1], out: [1, 0], origin: (room) => [-room.width / 2, room.depth / 2] },
  right: { along: [0, 1], out: [-1, 0], origin: (room) => [room.width / 2, room.depth / 2] },
}

/** A spot on a wall, `along` it and `out` from it, as the room's x and z. */
export function toRoom(wall: Wall, along: number, out: number, room: Room): PlanVector {
  const { along: a, out: o, origin } = WALL_FRAMES[wall]
  const [x, z] = origin(room)
  return [x + a[0] * along + o[0] * out, z + a[1] * along + o[1] * out]
}

/** The inverse of `toRoom`: a spot in the room's x and z, as how far along and out from a wall it is. */
function fromRoom(wall: Wall, [x, z]: PlanVector, room: Room): [along: number, out: number] {
  const { along: a, out: o, origin } = WALL_FRAMES[wall]
  const [dx, dz] = [x - origin(room)[0], z - origin(room)[1]]
  return [a[0] * dx + a[1] * dz, o[0] * dx + o[1] * dz]
}

/**
 * Where a piece is in the room, given where it starts front to back (`z`, from
 * `wallDepthStart`).
 */
export function roomBox(piece: Piece, z: number, room: Room): RoomBox {
  const wall = wallOf(piece)
  const [ax, az] = toRoom(wall, piece.x, z, room)
  const [bx, bz] = toRoom(wall, piece.x + piece.width, z + piece.depth, room)
  return {
    min: [Math.min(ax, bx), piece.y, Math.min(az, bz)],
    max: [Math.max(ax, bx), piece.y + piece.height, Math.max(az, bz)],
  }
}

/**
 * A box in the room as it appears in one wall's front view: a rectangle in
 * that wall's x and y, and how far out from that wall its nearest side is.
 * Used to show the neighbouring walls' parts in a corner.
 */
export function fromWall(box: RoomBox, wall: Wall, room: Room) {
  const [a0, out0] = fromRoom(wall, [box.min[0], box.min[2]], room)
  const [a1, out1] = fromRoom(wall, [box.max[0], box.max[2]], room)
  const x = Math.min(a0, a1)
  return { x, y: box.min[1], width: Math.max(a0, a1) - x, height: box.max[1] - box.min[1], distance: Math.min(out0, out1) }
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
