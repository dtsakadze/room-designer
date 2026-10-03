import type { Dimension, Edge, Piece, Thickness } from '../types'
import { DRAWER_BOX_CLEARANCE, FRONT_GAP, RUNNER_GAP, RUNNER_LENGTHS } from './defaults'
import { grainOf } from './edges'

/**
 * One board of a drawer (named for the cut list, where it's listed under its
 * drawer), placed like a piece in its wall's front view (x, y,
 * width, height) plus `z`: how far from the back of the drawer's space it
 * starts. `axis` is the dimension that's the board's thickness, `bands` its
 * edge-banded edges and `grain` the dimension its grain runs along.
 */
export type DrawerPart = {
  role: 'front' | 'side' | 'back' | 'bottom'
  label: string
  board: keyof Thickness
  axis: Dimension
  bands: Edge[]
  grain: Dimension
  x: number
  y: number
  z: number
  width: number
  height: number
  depth: number
}

/**
 * The longest runner that fits behind the drawer's front, or null when even
 * the shortest one doesn't.
 */
export function runnerLength(drawer: Piece, thickness: Thickness) {
  const room = drawer.depth - thickness.front
  return RUNNER_LENGTHS.filter((length) => length <= room).at(-1) ?? null
}

/**
 * The boards a drawer is built from. The drawer part is the space it fills,
 * front included, as deep as it may go. How that space relates to the unit
 * depends on the front:
 *
 * - inset: the space is the opening, and the front sits inside it, flush with
 *   the front of the unit;
 * - overlay: the space is what the front covers, the opening plus the edges
 *   of the unit around it (a body board's thickness all round), and the front
 *   sits in front of the unit.
 *
 * Either way the front is `FRONT_GAP` smaller than the space on every edge,
 * cut from the fronts board. Behind it, the box is narrower than the opening
 * by a runner's gap each side, lower by `DRAWER_BOX_CLEARANCE`, and as long as
 * the runners (the space behind the front when it's too shallow for any). Its
 * sides stand on the bottom, a back-panel board, and its back fits between
 * them; sides and back are cut from the drawer-box board.
 *
 * The front is banded all round, with its grain the drawer's own; the sides
 * and back on their top edge, the one you see with the drawer open. Box
 * grain runs along each board's length.
 */
export function drawerParts(drawer: Piece, thickness: Thickness): DrawerPart[] {
  const front = thickness.front
  const box = thickness.drawer
  const b = thickness.back
  const g = FRONT_GAP
  const edge = drawer.overlay ? thickness.body : 0
  const opening = {
    x: drawer.x + edge,
    y: drawer.y + edge,
    width: Math.max(1, drawer.width - 2 * edge),
    height: Math.max(1, drawer.height - 2 * edge),
  }
  const length = runnerLength(drawer, thickness) ?? Math.max(1, drawer.depth - front)
  const boxWidth = Math.max(2 * box + 1, opening.width - 2 * RUNNER_GAP)
  const boxX = opening.x + (opening.width - boxWidth) / 2
  const wallHeight = Math.max(1, opening.height - DRAWER_BOX_CLEARANCE - b)
  // The box runs from just behind the front, back towards the wall.
  const frontZ = drawer.depth - front
  const boxZ = Math.max(0, frontZ - length)

  const part = (
    role: DrawerPart['role'],
    label: string,
    board: keyof Thickness,
    axis: Dimension,
    finish: Pick<DrawerPart, 'bands' | 'grain'>,
    rect: Omit<DrawerPart, 'role' | 'label' | 'board' | 'axis' | 'bands' | 'grain'>,
  ): DrawerPart => ({ role, label, board, axis, ...finish, ...rect })

  return [
    part('front', 'Front', 'front', 'depth', { bands: ['top', 'bottom', 'left', 'right'], grain: grainOf(drawer)! }, {
      x: drawer.x + g,
      y: drawer.y + g,
      z: frontZ,
      width: Math.max(1, drawer.width - 2 * g),
      height: Math.max(1, drawer.height - 2 * g),
      depth: front,
    }),
    part('bottom', 'Bottom', 'back', 'height', { bands: [], grain: 'depth' }, {
      x: boxX,
      y: opening.y,
      z: boxZ,
      width: boxWidth,
      height: b,
      depth: length,
    }),
    ...[boxX, boxX + boxWidth - box].map((x) =>
      part('side', 'Side', 'drawer', 'width', { bands: ['top'], grain: 'depth' }, {
        x,
        y: opening.y + b,
        z: boxZ,
        width: box,
        height: wallHeight,
        depth: length,
      }),
    ),
    part('back', 'Back', 'drawer', 'depth', { bands: ['top'], grain: 'width' }, {
      x: boxX + box,
      y: opening.y + b,
      z: boxZ,
      width: boxWidth - 2 * box,
      height: wallHeight,
      depth: box,
    }),
  ]
}
