import type { Piece, Room, Thickness, Wall } from '../types'
import {
  KINDS,
  DOOR_ANGLES,
  DOOR_LEAF_GAP,
  ACCESSORY_TYPES,
  DOOR_OPEN_ANGLE,
  HANDLE_TYPES,
  MAX_LENGTH,
  MAX_SLIDING_OVERLAP,
  PANE_THICKNESS,
  PANE_TYPES,
  PLINTH_RECESS,
  SLIDING_LANE_GAP,
  SLIDING_OVERLAP,
  SLIDING_PANELS,
  SLIDING_TRACK_HEIGHT,
} from './defaults'
import { drawerParts } from './drawer'
import { autoBands, autoGrain, boardEdges, faceDimensions } from './edges'
import { DEFAULT_ROOM, type RoomBox, isSideWall, roomBox, wallOf } from './room'

/** A part's optional fields: everything but what it is, where and how big. */
type OptionKey = Exclude<keyof Piece, 'id' | 'kind' | 'x' | 'y' | 'width' | 'height' | 'depth'>

const isDoor = (piece: Piece) => piece.kind === 'door'
const isHingedDoor = (piece: Piece) => piece.kind === 'door' && !piece.sliding
/** Doors and drawers: they have something to open them with. */
const opens = (piece: Piece) => piece.kind === 'door' || piece.kind === 'drawer'
const isGlass = (piece: Piece) => piece.pane !== undefined

/**
 * What's kept of each optional field: its value when it's valid and applies
 * to this kind of part, otherwise nothing. A field at its default is stored as
 * nothing too, so a part that's never been changed follows a better default
 * later. Each rule gets the raw value (`raw`, which may come from a hand-edited
 * save, so of any type) and the fields kept so far (`kept`, filled in this
 * order); it only ever looks at other fields through `kept`. Every optional
 * field of `Piece` must be listed, so a new one can't skip being checked.
 */
const OPTIONS: { [K in OptionKey]: (raw: Piece, kept: Piece) => Piece[K] | undefined } = {
  // The back wall (the default) and automatic front-to-back placement are stored as nothing.
  wall: (raw) => (isSideWall(raw.wall) ? raw.wall : undefined),
  z: (raw) => (typeof raw.z === 'number' && Number.isFinite(raw.z) ? clamp(round(raw.z), 0, MAX_LENGTH) : undefined),
  boxId: (raw) => (typeof raw.boxId === 'string' && raw.boxId !== '' ? raw.boxId : undefined),
  fixed: (raw) => (raw.kind === 'shelf' && raw.fixed === true) || undefined,
  railAt: (raw) => (raw.kind === 'rail' && raw.railAt === 'back' ? 'back' : undefined),
  // Sliding doors are a set of panels, not leaves on hinges: none of the hinge options apply.
  sliding: (raw) => (isDoor(raw) && SLIDING_PANELS.includes(raw.sliding!) ? raw.sliding : undefined),
  overlap: (raw, kept) => {
    if (!kept.sliding) return undefined
    const overlap = typeof raw.overlap === 'number' ? clamp(round(raw.overlap), 0, MAX_SLIDING_OVERLAP) : SLIDING_OVERLAP
    return overlap === SLIDING_OVERLAP ? undefined : overlap
  },
  double: (raw, kept) => (isHingedDoor(kept) && raw.double === true) || undefined,
  // A double door is hinged on both sides.
  hinge: (raw, kept) => (isHingedDoor(kept) && !kept.double && raw.hinge === 'right' ? 'right' : undefined),
  inset: (raw, kept) => (isHingedDoor(kept) && raw.inset === true) || undefined,
  openAngle: (raw, kept) =>
    isHingedDoor(kept) && raw.openAngle !== DOOR_OPEN_ANGLE && DOOR_ANGLES.includes(raw.openAngle!) ? raw.openAngle : undefined,
  softClose: (raw, kept) => (isHingedDoor(kept) && raw.softClose === true) || undefined,
  pane: (raw) => (isDoor(raw) && PANE_TYPES.includes(raw.pane!) ? raw.pane : undefined),
  noHandle: (raw) => (opens(raw) && raw.noHandle === true) || undefined,
  close: (raw) => (raw.kind === 'drawer' && (raw.close === 'soft' || raw.close === 'push') ? raw.close : undefined),
  // What it's opened with only matters when it has something to open it: push
  // is for hinged doors (a drawer's is its runners, and sliding doors have none).
  handle: (raw, kept) => {
    if (!opens(raw) || kept.noHandle || !HANDLE_TYPES.includes(raw.handle!)) return undefined
    if (raw.handle === 'push' && !isHingedDoor(kept)) return undefined
    return kept.close === 'push' ? undefined : raw.handle
  },
  // Standard runners are the default.
  extension: (raw) => (raw.kind === 'drawer' && raw.extension === 'full' ? 'full' : undefined),
  overlay: (raw) => (raw.kind === 'drawer' && raw.overlay === true) || undefined,
  lift: (raw) => (raw.kind === 'rod' && raw.lift === true) || undefined,
  // An accessory is always one of the known kinds; anything else is a basket.
  accessory: (raw) =>
    raw.kind !== 'accessory' ? undefined : ACCESSORY_TYPES.includes(raw.accessory!) ? raw.accessory : 'basket',
  // Glass and mirror aren't board: none of a board's finish.
  bands: (raw, kept) => {
    const board = KINDS[raw.kind].board
    if (!board || isGlass(kept) || !Array.isArray(raw.bands)) return undefined
    const bands = boardEdges(board.axis).filter((edge) => raw.bands!.includes(edge))
    return bands.join() === autoBands(kept).join() ? undefined : bands
  },
  grain: (raw, kept) => {
    const board = KINDS[raw.kind].board
    // A drawer's grain is its front's, which faces forward.
    const faces = board ? faceDimensions(board.axis) : raw.kind === 'drawer' ? faceDimensions('depth') : []
    if (isGlass(kept) || !faces.includes(raw.grain!) || raw.grain === autoGrain(raw.kind)) return undefined
    return raw.grain
  },
  color: (raw, kept) => (!isGlass(kept) && isHexColor(raw.color) ? raw.color : undefined),
}

const OPTION_KEYS = Object.keys(OPTIONS) as OptionKey[]

/**
 * Keeps a piece a sane size and stops it sinking through the floor, and keeps
 * only the options that apply to it (see `OPTIONS`). A board's thickness is
 * always reset to the project thickness, so it can't drift. Saves go through
 * it too, so it takes fields of any type.
 */
export function normalizePiece(piece: Piece, thickness: Thickness): Piece {
  const height = atLeast(piece.height)
  const normalized: Piece = {
    id: piece.id,
    kind: piece.kind,
    x: clamp(round(piece.x), -MAX_LENGTH, MAX_LENGTH),
    y: clamp(round(piece.y), 0, MAX_LENGTH),
    width: atLeast(piece.width),
    height,
    // A rod is round, so its height and depth are one number: the diameter.
    depth: piece.kind === 'rod' ? height : atLeast(piece.depth),
  }
  for (const key of OPTION_KEYS) {
    const value = OPTIONS[key](piece, normalized)
    if (value !== undefined) (normalized as Record<OptionKey, unknown>)[key] = value
  }
  const board = KINDS[piece.kind].board
  if (board) normalized[board.axis] = atLeast(thickness[board.board])
  // A drawer has to hold its front and, behind it, a box at least as long as
  // its back board; any shallower and its parts can't be made.
  if (piece.kind === 'drawer') normalized.depth = atLeast(normalized.depth, thickness.front + thickness.drawer + 1)
  // Glass and mirror have a thickness of their own, whatever the front board is.
  if (normalized.pane) normalized.depth = PANE_THICKNESS
  return normalized
}

/** Bounding box of everything placed so far, in mm. */
export function contentBounds(pieces: Rect[]) {
  if (pieces.length === 0) return null
  return pieces.reduce(
    (bounds, piece) => ({
      minX: Math.min(bounds.minX, piece.x),
      maxX: Math.max(bounds.maxX, piece.x + piece.width),
      minY: Math.min(bounds.minY, piece.y),
      maxY: Math.max(bounds.maxY, piece.y + piece.height),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
}

const round = (value: number) => (Number.isNaN(value) ? 0 : Math.round(value))
const atLeast = (value: number, min = 1) => Math.min(MAX_LENGTH, Math.max(min, round(value)))
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * A measured gap in the front view: from `from` to `to` along `axis`, drawn at
 * `at` on the other axis. All in design mm.
 */
export type Gap = { axis: 'x' | 'y'; from: number; to: number; at: number }

/** A rectangle in the front view, in design mm (y up). */
export type Rect = { x: number; y: number; width: number; height: number }

/**
 * The clear distances from a piece to whatever it faces on each side, and to
 * the floor below where nothing is in between. Each side is scanned along its
 * whole edge, so a shelf with a divider standing on it gets the height of the
 * opening on both sides of the divider, not just the divider it touches. Parts
 * that touch (no gap) show nothing. The back panel sits behind everything and
 * doors in front of it, so neither is in the way of the parts inside (a door
 * still measures to the parts around it). `obstacles` are other things to
 * measure to, such as the room's walls and the parts of the unit on the next
 * wall.
 */
export function neighbourGaps(piece: Piece, pieces: Piece[], obstacles: Rect[] = []): Gap[] {
  const box = edges(piece)
  const inTheWay = (other: Piece) =>
    other.id !== piece.id && other.kind !== 'back' && (piece.kind === 'door' || other.kind !== 'door')
  const others = [...pieces.filter(inTheWay), ...obstacles]
    .map(edges)
    .filter((other) => !overlaps(box, other))

  return [
    ...sideGaps(box, others, 'up'),
    ...sideGaps(box, others, 'down'),
    ...sideGaps(box, others, 'left'),
    ...sideGaps(box, others, 'right'),
  ]
}

/**
 * Where a part goes when it's dragged near the middle of its space: on each
 * axis, the space between the nearest neighbours either side (see
 * `neighbourGaps`; below, the floor counts). When the part is within
 * `threshold` mm of the middle, it moves there, and `centred` holds the two
 * now-equal gaps either side, for drawing. Otherwise it stays where it was
 * put, with nothing centred on that axis.
 */
export function snapToMiddle(piece: Piece, pieces: Piece[], obstacles: Rect[], threshold: number) {
  const gaps = neighbourGaps(piece, pieces, obstacles)
  const shortest = (list: Gap[]) =>
    list.reduce<Gap | null>((best, gap) => (!best || gap.to - gap.from < best.to - best.from ? gap : best), null)

  const axis = (name: 'x' | 'y', start: number, end: number) => {
    const before = shortest(gaps.filter((gap) => gap.axis === name && gap.to === start))
    const after = shortest(gaps.filter((gap) => gap.axis === name && gap.from === end))
    if (!before || !after) return { offset: 0, centred: null }
    const offset = (after.to - after.from - (before.to - before.from)) / 2
    if (Math.abs(offset) > threshold) return { offset: 0, centred: null }
    return {
      offset,
      centred: [
        { ...before, to: before.to + offset },
        { ...after, from: after.from + offset },
      ],
    }
  }

  const x = axis('x', piece.x, piece.x + piece.width)
  const y = axis('y', piece.y, piece.y + piece.height)
  return { x: piece.x + x.offset, y: piece.y + y.offset, centredX: x.centred, centredY: y.centred }
}

/**
 * The equal gaps to show around a part dragged to the middle of its space,
 * on the axes where it really ended up there (`placed`): an adjustable shelf
 * goes to the nearest pin hole after, which may not be the middle.
 */
export function centredGaps(middle: ReturnType<typeof snapToMiddle>, placed: Pick<Piece, 'x' | 'y'>): Gap[] {
  return [
    ...(Math.abs(placed.x - middle.x) <= 0.5 ? (middle.centredX ?? []) : []),
    ...(Math.abs(placed.y - middle.y) <= 0.5 ? (middle.centredY ?? []) : []),
  ]
}

type Side = 'up' | 'down' | 'left' | 'right'

function sideGaps(box: Edges, others: Edges[], side: Side): Gap[] {
  const vertical = side === 'up' || side === 'down'
  // Along the edge being scanned, and across it towards the neighbours.
  const [start, end] = vertical ? [box.left, box.right] : [box.bottom, box.top]
  const span = (o: Edges) => (vertical ? [o.left, o.right] : [o.bottom, o.top])
  const edge = { up: box.top, down: box.bottom, left: box.left, right: box.right }[side]
  const facing = (o: Edges) => ({ up: o.bottom, down: o.top, left: o.right, right: o.left })[side]
  const ahead = (o: Edges) =>
    side === 'up' || side === 'right' ? facing(o) >= edge : facing(o) <= edge
  const distance = (o: Edges) => Math.abs(facing(o) - edge)

  const candidates = others.filter((o) => {
    const [a, b] = span(o)
    return a < end && b > start && ahead(o)
  })

  // Cut the edge wherever a candidate starts or stops; each piece in between
  // faces one nearest neighbour (or nothing).
  const cuts = [start, end, ...candidates.flatMap(span)]
    .filter((v) => v >= start && v <= end)
    .sort((a, b) => a - b)

  const runs: { from: number; to: number; target: Edges | null }[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const [from, to] = [cuts[i], cuts[i + 1]]
    if (to <= from) continue
    const mid = (from + to) / 2
    const target = candidates
      .filter((o) => {
        const [a, b] = span(o)
        return a < mid && b > mid
      })
      .reduce<Edges | null>((best, o) => (!best || distance(o) < distance(best) ? o : best), null)
    const last = runs[runs.length - 1]
    if (last && last.target === target && last.to === from) last.to = to
    else runs.push({ from, to, target })
  }

  return runs.flatMap(({ from, to, target }) => {
    // Nothing below: measure to the floor. Nothing elsewhere: no line.
    const far = target ? facing(target) : side === 'down' ? 0 : null
    if (far === null || far === edge) return []
    const at = (from + to) / 2
    const [a, b] = [Math.min(edge, far), Math.max(edge, far)]
    return [{ axis: vertical ? ('y' as const) : ('x' as const), from: a, to: b, at }]
  })
}

type Edges = { left: number; right: number; bottom: number; top: number }

const edges = (piece: Rect): Edges => ({
  left: piece.x,
  right: piece.x + piece.width,
  bottom: piece.y,
  top: piece.y + piece.height,
})

const overlaps = (a: Edges, b: Edges) =>
  a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom

/**
 * Where each piece starts, front to back, in mm from the wall (z = 0): its own
 * `z` when it has one. Otherwise everything sits flush against the back: the
 * back panel takes the first `thickness.back` mm, and the rest start in front
 * of it. The exceptions: the plinth sits at the front, set back a little, a rail
 * runs along the front unless it's marked as a back rail, a hanging rod hangs
 * halfway between the back panel and the front, where hangers fit, trim and
 * accessories sit flush with the front edge, a door stands in
 * front of the unit (overlay) or just inside its front edge (inset), and so
 * does a drawer's front, its box behind it inside the unit.
 */
function depthStart(pieces: Piece[], thickness: Thickness) {
  const hasBack = pieces.some((piece) => piece.kind === 'back')
  const behind = (piece: Piece) => (piece.kind === 'back' || !hasBack ? 0 : thickness.back)
  // A part given its own front-to-back position goes there; the rest are automatic.
  const front = Math.max(
    0,
    ...pieces
      .filter((piece) => KINDS[piece.kind].setsDepth)
      .map((piece) => (piece.z ?? behind(piece)) + piece.depth),
  )
  return (piece: Piece) => {
    if (piece.z !== undefined) return piece.z
    if (piece.kind === 'plinth') return Math.max(0, front - PLINTH_RECESS - piece.depth)
    if (piece.kind === 'rail' && piece.railAt !== 'back') return Math.max(0, front - piece.depth)
    if (piece.kind === 'rod') {
      const inside = behind(piece)
      return Math.max(inside, Math.round(inside + (front - inside - piece.depth) / 2))
    }
    // A pull-out or shoe shelf starts at the front of the unit, not against the back.
    if (piece.kind === 'accessory') return Math.max(0, front - piece.depth)
    // Trim sits flush with the front edges of the unit, like an inset door.
    if (piece.kind === 'filler' || piece.kind === 'cornice') return Math.max(0, front - piece.depth)
    if (piece.kind === 'door') return piece.inset ? Math.max(0, front - piece.depth) : front
    if (piece.kind === 'drawer') {
      // An overlay front stands in front of the unit, by its own thickness.
      return Math.max(0, front - piece.depth + (piece.overlay ? thickness.front : 0))
    }
    return behind(piece)
  }
}

/**
 * Where each part starts front to back (see `depthStart`), with each wall's
 * unit placed on its own, so one run's plinth and front rails follow that
 * run's depth. Everything that places parts front to back goes through this.
 */
export function wallDepthStart(pieces: Piece[], thickness: Thickness) {
  const byWall = new Map<Wall, (piece: Piece) => number>()
  for (const wall of new Set(pieces.map(wallOf))) {
    byWall.set(
      wall,
      depthStart(
        pieces.filter((piece) => wallOf(piece) === wall),
        thickness,
      ),
    )
  }
  return (piece: Piece) => byWall.get(wallOf(piece))?.(piece) ?? 0
}

/** Overlaps smaller than this (rounding, not a real clash) are ignored, in mm. */
const CLASH_TOLERANCE = 0.5

/**
 * The solid boxes a piece is made of in the room, given where it starts front
 * to back: a drawer's boards (its space is mostly empty, and an overlay front
 * reaches over the unit's edges), a door's fronts (sliding panels each in
 * their lane), or the piece itself.
 */
export function pieceSolids(piece: Piece, z: number, thickness: Thickness, room: Room): RoomBox[] {
  if (piece.kind === 'drawer') {
    return drawerParts(piece, thickness).map((part) =>
      roomBox({ ...piece, ...part }, z + part.z, room),
    )
  }
  // A sliding panel in the front lane stands one lane spacing ahead of the back one.
  return doorFronts(piece).map((front) =>
    roomBox(front, z + (front.lane === 0 ? slidingLaneSpacing(piece) : 0), room),
  )
}

/**
 * Pieces that take up the same space as another, checked as their real solids
 * in the room (front-to-back placement from `wallDepthStart`), so units on two
 * walls that run into each other in a corner clash too. Touching isn't a
 * clash, and neither is the back panel sitting behind everything in the front
 * view.
 */
export function findClashes(pieces: Piece[], thickness: Thickness, room: Room = DEFAULT_ROOM) {
  const zStart = wallDepthStart(pieces, thickness)
  const boxes = pieces.flatMap((piece) =>
    pieceSolids(piece, zStart(piece), thickness, room).map((box) => ({ id: piece.id, ...box })),
  )
  const clashing = new Set<string>()
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]]
      // A piece's own boards meet, but can't clash with each other.
      if (a.id === b.id) continue
      const overlaps = [0, 1, 2].every((axis) => {
        const shared = Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis])
        return shared > CLASH_TOLERANCE
      })
      if (overlaps) {
        clashing.add(a.id)
        clashing.add(b.id)
      }
    }
  }
  return clashing
}

/**
 * Free height below a hanging rod: down to the highest part underneath it (a
 * shelf, a drawer, the bottom panel) or the floor. Parts that only overlap part
 * of the rod's length still count, since clothes hang all along it.
 */
export function clearanceBelow(rod: Piece, pieces: Piece[]) {
  const below = pieces.filter(
    (piece) =>
      piece.id !== rod.id &&
      piece.kind !== 'back' &&
      piece.kind !== 'door' &&
      piece.x < rod.x + rod.width &&
      piece.x + piece.width > rod.x &&
      piece.y + piece.height <= rod.y,
  )
  const floor = Math.max(0, ...below.map((piece) => piece.y + piece.height))
  return rod.y - floor
}

/**
 * A door's leaves as they're cut: the door itself, or for a double door two
 * halves with a small gap between them. Along the door's width only, so it
 * works on any rectangle that spans it (the front view, or a wall's run in 3D).
 * Leaves are whole mm, rounded down: the cut list shows whole mm, and a
 * 598.5 mm leaf shown and cut as 599 would make the pair 1 mm too wide. The
 * gap between them takes the spare half mm each.
 */
export function doorLeaves<T extends { x: number; width: number }>(
  piece: T,
  double: boolean | undefined,
): T[] {
  if (!double) return [piece]
  const width = Math.max(1, Math.floor((piece.width - DOOR_LEAF_GAP) / 2))
  return [
    { ...piece, width },
    { ...piece, x: piece.x + piece.width - width, width },
  ]
}

/**
 * The panels of a set of sliding doors, left to right: each as wide as the
 * set less what its neighbours overlap, in alternating lanes (`lane` 0 is
 * the front one), shorter than the set by the tracks they run in. Works on
 * any rectangle that spans the set, like `doorLeaves`. Panels are whole mm,
 * rounded down like leaves, and spread so the outer ones stay flush with the
 * set's ends; the overlaps take the spare fraction of a mm.
 */
export function slidingPanels<T extends { x: number; y: number; width: number; height: number }>(
  piece: T & { sliding: number; overlap?: number },
): (T & { lane: number })[] {
  const count = piece.sliding
  // No more than a panel's share of the set, or a set narrower than its
  // overlap would have panels wider than itself, stepping off to the left.
  const overlap = Math.min(piece.overlap ?? SLIDING_OVERLAP, Math.floor(piece.width / count))
  const width = Math.max(1, Math.floor((piece.width + overlap * (count - 1)) / count))
  const step = count > 1 ? (piece.width - width) / (count - 1) : 0
  return Array.from({ length: count }, (_, index) => ({
    ...piece,
    x: piece.x + Math.round(index * step),
    y: piece.y + SLIDING_TRACK_HEIGHT,
    width,
    height: Math.max(1, piece.height - 2 * SLIDING_TRACK_HEIGHT),
    lane: index % 2,
  }))
}

/**
 * How far apart a set of sliding doors' two lanes are, front to back: a
 * panel's thickness and a small gap, so the panels slide past each other.
 */
export const slidingLaneSpacing = (piece: Pick<Piece, 'depth'>) => piece.depth + SLIDING_LANE_GAP

/**
 * One front of a door or drawer: a sliding panel with its `lane` (0 is the
 * front one), or a hinged leaf with the side it's hinged on.
 */
export type Front = Piece & { lane?: number; hingeSide?: 'left' | 'right' }

/**
 * The fronts a door or drawer is made of, left to right, each opened on its
 * own: a set of sliding doors' panels, a double door's leaves (each hinged on
 * its outer side), or the door itself (hinged on its hinge side). A drawer
 * is its own single front.
 */
export function doorFronts(piece: Piece): Front[] {
  if (piece.kind !== 'door') return [piece]
  if (piece.sliding) return slidingPanels({ ...piece, sliding: piece.sliding })
  if (piece.double) {
    return doorLeaves(piece, true).map((leaf, index) => ({ ...leaf, hingeSide: index === 0 ? 'left' : 'right' }))
  }
  return [{ ...piece, hingeSide: piece.hinge ?? 'left' }]
}

/**
 * How deep a part is from where it starts, front to back: its depth, or for a
 * set of sliding doors both lanes (the back lane starts where the set does).
 */
export const depthSpan = (piece: Piece) =>
  piece.kind === 'door' && piece.sliding ? piece.depth + slidingLaneSpacing(piece) : piece.depth

/**
 * All the space a part takes up in the room, as one box, given where it
 * starts front to back: both lanes of a set of sliding doors. For outlines
 * and reach; `pieceSolids` has the exact solids, for clashes.
 */
export const footprint = (piece: Piece, z: number, room: Room) => roomBox({ ...piece, depth: depthSpan(piece) }, z, room)

/** The box around everything placed, in room coordinates, or null when there's nothing. */
export function roomBounds(pieces: Piece[], thickness: Thickness, room: Room): RoomBox | null {
  if (pieces.length === 0) return null
  const zStart = wallDepthStart(pieces, thickness)
  return pieces
    .map((piece) => footprint(piece, zStart(piece), room))
    .reduce((all, box) => ({
      min: [0, 1, 2].map((axis) => Math.min(all.min[axis], box.min[axis])) as RoomBox['min'],
      max: [0, 1, 2].map((axis) => Math.max(all.max[axis], box.max[axis])) as RoomBox['max'],
    }))
}

/**
 * Where a part goes to fill the gap between the side panels or dividers left
 * and right of it, on its wall: the nearest one each side of its middle that
 * reaches its height. It runs from face to face, except an overlay drawer,
 * whose front covers the panels' edges, so it runs across them: all of a
 * side's edge, but only half of a divider's, which the drawer in the next bay
 * shares (as half-overlay hinges do). Null when there isn't a panel on both
 * sides.
 */
export function fitBetweenSides(piece: Piece, pieces: Piece[]): { x: number; width: number } | null {
  const middle = piece.x + piece.width / 2
  const wall = wallOf(piece)
  const panels = pieces.filter(
    (p) =>
      p.id !== piece.id &&
      KINDS[p.kind].upright &&
      wallOf(p) === wall &&
      p.y < piece.y + piece.height &&
      piece.y < p.y + p.height,
  )
  const left = panels
    .filter((p) => p.x + p.width <= middle)
    .reduce<Piece | null>((best, p) => (!best || p.x + p.width > best.x + best.width ? p : best), null)
  const right = panels
    .filter((p) => p.x >= middle)
    .reduce<Piece | null>((best, p) => (!best || p.x < best.x ? p : best), null)
  if (!left || !right) return null
  const overlay = piece.kind === 'drawer' && piece.overlay
  const covered = (panel: Piece) => (panel.kind === 'divider' ? panel.width / 2 : panel.width)
  const from = left.x + left.width - (overlay ? covered(left) : 0)
  const to = right.x + (overlay ? covered(right) : 0)
  return to > from ? { x: from, width: to - from } : null
}

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
