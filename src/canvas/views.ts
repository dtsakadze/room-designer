import { BOARD } from '../lib/defaults'
import { type Rect, depthStart, doorLeaves, wallDepthStart } from '../lib/geometry'
import { adjacentWalls, fromWall, roomBox, wallLength, wallOf } from '../lib/room'
import type { Piece, Room, Thickness, Wall } from '../types'

export type ViewName = 'front' | 'left' | 'right' | 'top' | 'back' | '3d'

export const VIEWS: { name: ViewName; label: string }[] = [
  { name: 'front', label: 'Front' },
  { name: 'left', label: 'Left side' },
  { name: 'right', label: 'Right side' },
  { name: 'top', label: 'Top' },
  { name: 'back', label: 'Back' },
  { name: '3d', label: '3D' },
]

/**
 * Pieces as seen from one side, as flat rectangles in the same 2D space the
 * front view uses (x right, y up), ordered so nearer pieces draw on top. Only
 * the front view is edited; the others are read-only projections.
 * Front-to-back placement comes from `depthStart`.
 */
export function projectPieces(pieces: Piece[], view: ViewName, thickness: Thickness): Piece[] {
  // The 3D preview draws the pieces themselves.
  if (view === 'front' || view === '3d') return pieces
  const zStart = depthStart(pieces, thickness)

  switch (view) {
    // From the left: the wall on the left, the front of the unit on the right.
    // Pieces further left are nearer, so they draw last.
    case 'left':
      return [...pieces]
        .sort((a, b) => b.x - a.x)
        .map((piece) => ({ ...piece, x: zStart(piece), width: piece.depth }))
    // The mirror of that: the wall on the right, and pieces further right are
    // nearer. Where parts overlap, the two sides can show different things.
    case 'right':
      return [...pieces]
        .sort((a, b) => a.x + a.width - (b.x + b.width))
        .map((piece) => ({ ...piece, x: -(zStart(piece) + piece.depth), width: piece.depth }))
    // A plan: the wall along the top (y = 0), the unit's front towards the
    // bottom. Higher pieces are nearer, so they draw last.
    case 'top':
      return [...pieces]
        .sort((a, b) => a.y + a.height - (b.y + b.height))
        .map((piece) => ({
          ...piece,
          y: -(zStart(piece) + piece.depth),
          height: piece.depth,
        }))
    // From behind, so left and right swap. The back panel is nearest.
    case 'back':
      return [...pieces]
        .sort((a, b) => zStart(b) - zStart(a))
        .map((piece) => ({ ...piece, x: -(piece.x + piece.width) }))
  }
}

/**
 * The top view of the whole room: every wall's pieces in plan, turned to face
 * out from their wall. The back wall runs along the top (y = 0) and the room
 * opens towards the bottom. With only the back wall this is the same as the
 * top view of one unit.
 */
export function roomPlan(pieces: Piece[], thickness: Thickness, room: Room): Piece[] {
  const zStart = wallDepthStart(pieces, thickness)
  // Higher pieces are nearer, so they draw last.
  return [...pieces]
    .sort((a, b) => a.y + a.height - (b.y + b.height))
    .map((piece) => {
      const { min, max } = roomBox(piece, zStart(piece), room)
      return { ...piece, x: min[0], width: max[0] - min[0], y: -max[2], height: max[2] - min[2] }
    })
}

/** A point in the top view, in the same design mm as `roomPlan` (y = 0 at the back wall, down into the room). */
export type PlanPoint = { x: number; y: number }

/**
 * How one door leaf swings, in the top view: it turns about `pivot` (its hinge,
 * on the door's front face) from `closed` (the other end of the leaf, shut) to
 * `open` (out into the room, at a right angle). The arc between them is the
 * floor it sweeps.
 */
export type DoorSwing = { id: string; pivot: PlanPoint; closed: PlanPoint; open: PlanPoint }

/**
 * Where a spot on a wall's unit is in the top view: `along` the wall in that
 * wall's front-view x, `out` from the wall.
 */
function planPoint(wall: Wall, along: number, out: number, room: Room): PlanPoint {
  const [halfWidth, halfDepth] = [room.width / 2, room.depth / 2]
  switch (wall) {
    case 'back':
      return { x: along, y: -out }
    case 'left':
      return { x: -halfWidth + out, y: -(halfDepth - along) }
    case 'right':
      return { x: halfWidth - out, y: -(halfDepth + along) }
  }
}

/**
 * The swing of every door leaf, for the top view: a single door turns on the
 * side it's hinged, and each leaf of a double door on its outer side.
 */
export function doorSwings(pieces: Piece[], thickness: Thickness, room: Room): DoorSwing[] {
  const zStart = wallDepthStart(pieces, thickness)
  return pieces
    .filter((piece) => piece.kind === 'door')
    .flatMap((door) => {
      const wall = wallOf(door)
      const face = zStart(door) + door.depth
      return doorLeaves(door, door.double).map((leaf, index) => {
        const hingedLeft = door.double ? index === 0 : door.hinge !== 'right'
        const [hinge, end] = hingedLeft ? [leaf.x, leaf.x + leaf.width] : [leaf.x + leaf.width, leaf.x]
        return {
          id: door.id,
          pivot: planPoint(wall, hinge, face, room),
          closed: planPoint(wall, end, face, room),
          open: planPoint(wall, hinge, face + leaf.width, room),
        }
      })
    })
}

/** The square a swing's quarter circle fits in, for framing the top view. */
export function swingBounds({ pivot, closed, open }: DoorSwing): Rect {
  const corner = { x: closed.x + open.x - pivot.x, y: closed.y + open.y - pivot.y }
  const xs = [pivot.x, closed.x, open.x, corner.x]
  const ys = [pivot.y, closed.y, open.y, corner.y]
  const [x, y] = [Math.min(...xs), Math.min(...ys)]
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/**
 * The parts on the walls next to this one that come within `reach` of it
 * (how deep this wall's unit is), as they look from in front of it: a unit on
 * a side wall shows up at the end of the back wall where it stands in the
 * corner. Drawn faintly, so you can see how far into the corner it comes
 * before placing anything there. Parts further out stand clear of this
 * wall's unit, so they're left out.
 */
export function cornerGhosts(
  pieces: Piece[],
  thickness: Thickness,
  room: Room,
  wall: Wall,
  reach: number,
) {
  const neighbours = new Set(adjacentWalls(wall, room))
  const zStart = wallDepthStart(pieces, thickness)
  return pieces
    .filter((piece) => neighbours.has(wallOf(piece)))
    .flatMap((piece) => {
      const { distance, ...rect } = fromWall(roomBox(piece, zStart(piece), room), wall, room)
      return distance < reach ? [{ id: piece.id, ...rect }] : []
    })
}

/** Far enough to count as "the rest of the wall" beyond a corner, in mm. */
const BEYOND = 100000

/**
 * The walls at each end of a wall, as solid blocks beyond its corners (for gap
 * lines measured to the wall). Standing at a side wall, one end is the back
 * wall and the other the room's front wall.
 */
export function endWalls(room: Room, wall: Wall): Rect[] {
  const half = wallLength(room, wall) / 2
  return [
    { x: -half - BEYOND, y: 0, width: BEYOND, height: BEYOND },
    { x: half, y: 0, width: BEYOND, height: BEYOND },
  ]
}

/** The size shown next to a selected piece, in the view's own terms. */
export function sizeLabel(piece: Piece, view: ViewName, len: (mm: number) => string) {
  if (piece.kind === 'rod') {
    // End-on from the side a rod is just its round section.
    if (view === 'left' || view === 'right') return `⌀${len(piece.height)}`
    const [diameter, length] = [piece.width, piece.height].sort((a, b) => a - b)
    return `⌀${len(diameter)} × ${len(length)}`
  }
  return `${len(piece.width)} × ${len(piece.height)}`
}

/**
 * The panels that cover the whole unit in a view (the back panel and doors from
 * the front or back, the sides from either side, the top and bottom from above).
 * They are drawn see-through, or the view would show one solid panel and the
 * inside couldn't be edited.
 */
export function isHollow(piece: Piece, view: ViewName) {
  if (view === 'left' || view === 'right') return piece.kind === 'vertical'
  if (view === 'top') return piece.kind === 'horizontal'
  return piece.kind === 'back' || piece.kind === 'door'
}

/**
 * Doors are nearest of all from the front, so there they're drawn over the
 * parts inside, see-through, rather than underneath like the back panel.
 */
const isOnTop = (piece: Piece, view: ViewName) => view === 'front' && piece.kind === 'door'

/**
 * The order to draw pieces in: see-through panels underneath everything, then
 * the rest, then doors on top in the front view.
 */
export function drawOrder(pieces: Piece[], view: ViewName) {
  const under = (piece: Piece) => isHollow(piece, view) && !isOnTop(piece, view)
  return [
    ...pieces.filter(under),
    ...pieces.filter((piece) => !under(piece) && !isOnTop(piece, view)),
    ...pieces.filter((piece) => isOnTop(piece, view)),
  ]
}

/**
 * Every shown piece under a point, topmost first: a door, then the parts
 * inside, then the see-through panels behind them. Clicking again through a
 * stack goes down it in this order.
 */
export function piecesAt(shown: Piece[], x: number, y: number, view: ViewName) {
  return drawOrder(shown, view)
    .filter((p) => x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height)
    .reverse()
}

/** Which of a board's dimensions points at the viewer in each flat view. */
const LOOKING_ALONG = { front: 'depth', back: 'depth', left: 'width', right: 'width', top: 'height' } as const

/**
 * Whether a board is seen edge-on (its thickness runs across the view), as a
 * shelf is from the front. Those are drawn darker, so a cut edge reads
 * differently from a board's face. Rods and drawers aren't boards.
 */
export function showsEdge(piece: Piece, view: ViewName) {
  const board = BOARD[piece.kind]
  if (!board || view === '3d') return false
  return board.axis !== LOOKING_ALONG[view]
}
