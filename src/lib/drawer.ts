import type { Piece, Thickness } from '../types'
import { DRAWER_BOX_CLEARANCE, RUNNER_GAP, RUNNER_LENGTHS } from './defaults'

/**
 * One board of a drawer (named for the cut list, where it's listed under its
 * drawer), placed like a piece in its wall's front view (x, y,
 * width, height) plus `z`: how far from the back of the drawer's space it
 * starts. `axis` is the dimension that's the board's thickness.
 */
export type DrawerPart = {
  role: 'front' | 'side' | 'back' | 'bottom'
  label: string
  board: keyof Thickness
  axis: 'width' | 'height' | 'depth'
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
  const room = drawer.depth - thickness.body
  return RUNNER_LENGTHS.filter((length) => length <= room).at(-1) ?? null
}

/**
 * The boards a drawer is built from. The drawer part is the space it fills: as
 * wide as its opening, as high as its front, and as deep as it may go, front
 * included. From that:
 *
 * - the front is the whole width × height, flush with the front of the space;
 * - the box behind it is narrower by a runner's gap each side, lower than the
 *   front by `DRAWER_BOX_CLEARANCE`, and as long as the runners (the space
 *   behind the front when it's too shallow for any);
 * - the sides stand on the bottom and the back fits between them. The bottom
 *   is a back-panel board.
 */
export function drawerParts(drawer: Piece, thickness: Thickness): DrawerPart[] {
  const t = thickness.body
  const b = thickness.back
  const length = runnerLength(drawer, thickness) ?? Math.max(1, drawer.depth - t)
  const boxWidth = Math.max(2 * t + 1, drawer.width - 2 * RUNNER_GAP)
  const boxX = drawer.x + (drawer.width - boxWidth) / 2
  const wallHeight = Math.max(1, drawer.height - DRAWER_BOX_CLEARANCE - b)
  // The box runs from just behind the front, back towards the wall.
  const frontZ = drawer.depth - t
  const boxZ = Math.max(0, frontZ - length)

  const part = (
    role: DrawerPart['role'],
    label: string,
    board: keyof Thickness,
    axis: DrawerPart['axis'],
    rect: Omit<DrawerPart, 'role' | 'label' | 'board' | 'axis'>,
  ): DrawerPart => ({ role, label, board, axis, ...rect })

  return [
    part('front', 'Front', 'body', 'depth', {
      x: drawer.x,
      y: drawer.y,
      z: frontZ,
      width: drawer.width,
      height: drawer.height,
      depth: t,
    }),
    part('bottom', 'Bottom', 'back', 'height', {
      x: boxX,
      y: drawer.y,
      z: boxZ,
      width: boxWidth,
      height: b,
      depth: length,
    }),
    ...[boxX, boxX + boxWidth - t].map((x) =>
      part('side', 'Side', 'body', 'width', {
        x,
        y: drawer.y + b,
        z: boxZ,
        width: t,
        height: wallHeight,
        depth: length,
      }),
    ),
    part('back', 'Back', 'body', 'depth', {
      x: boxX + t,
      y: drawer.y + b,
      z: boxZ,
      width: boxWidth - 2 * t,
      height: wallHeight,
      depth: t,
    }),
  ]
}
