import { BOARD } from '../lib/defaults'
import { type Rect, depthStart, wallDepthStart } from '../lib/geometry'
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
 * The panels that cover the whole unit in a view (the back panel from the
 * front or back, the sides from either side, the top and bottom from above). They
 * are drawn see-through, or the view would show one solid panel.
 */
export function isHollow(piece: Piece, view: ViewName) {
  if (view === 'left' || view === 'right') return piece.kind === 'vertical'
  if (view === 'top') return piece.kind === 'horizontal'
  return piece.kind === 'back'
}

/**
 * Every shown piece under a point, topmost first. See-through panels go last,
 * so clicking through a stack reaches the parts inside before the panel.
 */
export function piecesAt(shown: Piece[], x: number, y: number, view: ViewName) {
  const under = shown
    .filter((p) => x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height)
    .reverse()
  return [
    ...under.filter((piece) => !isHollow(piece, view)),
    ...under.filter((piece) => isHollow(piece, view)),
  ]
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
