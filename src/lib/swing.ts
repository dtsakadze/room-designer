import type { Piece, Room, Thickness, Wall } from '../types'
import { DOOR_OPEN_ANGLE } from './defaults'
import { type Rect, doorLeaves, wallDepthStart } from './geometry'
import { hasSideWalls, roomBox, wallOf } from './room'

/**
 * A point in the top view, in the same design mm as the room plan: x across
 * the room (0 its middle), y = 0 at the back wall and negative into the room.
 */
export type PlanPoint = { x: number; y: number }

/**
 * How one door leaf swings, in the top view: it turns about `pivot` (its hinge,
 * on the door's front face) away from `closed` (the other end of the leaf,
 * shut). `square` is where that end is at a right angle, straight out into the
 * room; the two set the directions every other angle is worked out from.
 * `bottom` and `top` are the door's height range, since it can only hit what
 * it passes. `angle` is how far its hinges let it open.
 */
export type DoorSwing = {
  id: string
  wall: Wall
  pivot: PlanPoint
  closed: PlanPoint
  square: PlanPoint
  bottom: number
  top: number
  /** How far it opens, in degrees. */
  angle: number
}

/** Where a spot on a wall's unit is in the top view: `along` the wall in its front-view x, `out` from it. */
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
 * The swing of every door leaf: a single door turns on the side it's hinged,
 * and each leaf of a double door on its outer side.
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
          wall,
          pivot: planPoint(wall, hinge, face, room),
          closed: planPoint(wall, end, face, room),
          square: planPoint(wall, hinge, face + leaf.width, room),
          bottom: door.y,
          top: door.y + door.height,
          angle: door.openAngle ?? DOOR_OPEN_ANGLE,
        }
      })
    })
}

/** Where the leaf's free end is, opened by `degrees`. */
export function swingPoint({ pivot, closed, square }: DoorSwing, degrees: number): PlanPoint {
  const angle = (degrees * Math.PI) / 180
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)]
  return {
    x: pivot.x + cos * (closed.x - pivot.x) + sin * (square.x - pivot.x),
    y: pivot.y + cos * (closed.y - pivot.y) + sin * (square.y - pivot.y),
  }
}

/** Points along the arc, shut to fully open, close enough to the circle to measure with (under 0.5 mm off on a 600 mm door). */
const ARC_STEPS = 48

/** The arc the leaf's free end sweeps, from shut to fully open. */
export function swingArc(swing: DoorSwing): PlanPoint[] {
  return Array.from({ length: ARC_STEPS + 1 }, (_, step) =>
    swingPoint(swing, (step / ARC_STEPS) * swing.angle),
  )
}

/** The floor the leaf sweeps: the pivot and its arc, a convex fan. */
export const swingArea = (swing: DoorSwing): PlanPoint[] => [swing.pivot, ...swingArc(swing)]

/** The rectangle a swing fits in, for framing the top view. */
export function swingBounds(swing: DoorSwing): Rect {
  const points = swingArea(swing)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const [x, y] = [Math.min(...xs), Math.min(...ys)]
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** What an opening door runs into: a wall of the room, or a part (or door) on another wall. */
export type SwingHit = { kind: 'wall'; wall: Wall } | { kind: 'part'; id: string }

/** Far enough to stand for "the rest of the wall", in mm. */
const BEYOND = 100000
/** Overlaps smaller than this are rounding, not a door hitting something, in mm. */
const TOLERANCE = 0.5

/**
 * What each door would hit as it opens as far as its hinges go, by door id. Only
 * in a room with side walls: a single wall's doors open into free space. A
 * door is checked against the room's walls (the front of the room is open)
 * and against parts and door swings on the other walls, where their heights
 * overlap. Doors on the same wall aren't checked against each other: they're
 * designed together, and neighbours hinged on the same panel meet past square
 * when both are fully open, as intended.
 */
export function swingConflicts(pieces: Piece[], thickness: Thickness, room: Room) {
  const conflicts = new Map<string, SwingHit[]>()
  if (!hasSideWalls(room)) return conflicts

  const [halfWidth, depth] = [room.width / 2, room.depth]
  const walls: { wall: Wall; area: PlanPoint[] }[] = [
    { wall: 'back', area: rectPoints({ x: -BEYOND, y: 0, width: 2 * BEYOND, height: BEYOND }) },
    { wall: 'left', area: rectPoints({ x: -halfWidth - BEYOND, y: -depth - BEYOND, width: BEYOND, height: 2 * BEYOND + depth }) },
    { wall: 'right', area: rectPoints({ x: halfWidth, y: -depth - BEYOND, width: BEYOND, height: 2 * BEYOND + depth }) },
  ]
  const zStart = wallDepthStart(pieces, thickness)
  const parts = pieces.map((piece) => {
    const { min, max } = roomBox(piece, zStart(piece), room)
    const area = rectPoints({ x: min[0], y: -max[2], width: max[0] - min[0], height: max[2] - min[2] })
    return { piece, area }
  })
  const swings = doorSwings(pieces, thickness, room).map((swing) => ({ swing, area: swingArea(swing) }))

  const hit = (id: string, what: SwingHit) => {
    const list = conflicts.get(id) ?? []
    const same = (other: SwingHit) => JSON.stringify(other) === JSON.stringify(what)
    if (!list.some(same)) conflicts.set(id, [...list, what])
  }
  const overlapsHeight = (swing: DoorSwing, bottom: number, top: number) =>
    Math.min(swing.top, top) - Math.max(swing.bottom, bottom) > TOLERANCE

  for (const { swing, area } of swings) {
    for (const wall of walls) {
      if (convexOverlap(area, wall.area)) hit(swing.id, { kind: 'wall', wall: wall.wall })
    }
    for (const { piece, area: part } of parts) {
      if (wallOf(piece) === swing.wall) continue
      if (!overlapsHeight(swing, piece.y, piece.y + piece.height)) continue
      if (convexOverlap(area, part)) hit(swing.id, { kind: 'part', id: piece.id })
    }
    // Two doors in a corner, both opening.
    for (const other of swings) {
      if (other.swing.wall === swing.wall) continue
      if (!overlapsHeight(swing, other.swing.bottom, other.swing.top)) continue
      if (convexOverlap(area, other.area)) hit(swing.id, { kind: 'part', id: other.swing.id })
    }
  }
  return conflicts
}

const rectPoints = ({ x, y, width, height }: Rect): PlanPoint[] => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
]

/**
 * Whether two convex shapes overlap by more than `TOLERANCE` (touching isn't
 * hitting): they do unless some edge's direction separates them.
 */
function convexOverlap(a: PlanPoint[], b: PlanPoint[]) {
  for (const shape of [a, b]) {
    for (let i = 0; i < shape.length; i++) {
      const [p, q] = [shape[i], shape[(i + 1) % shape.length]]
      const length = Math.hypot(q.x - p.x, q.y - p.y)
      if (length === 0) continue
      const normal = { x: -(q.y - p.y) / length, y: (q.x - p.x) / length }
      const project = (points: PlanPoint[]) => points.map((point) => point.x * normal.x + point.y * normal.y)
      const [pa, pb] = [project(a), project(b)]
      const shared = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb))
      if (shared <= TOLERANCE) return false
    }
  }
  return true
}
