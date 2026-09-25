import type { Box, Piece, Thickness } from '../types'
import { normalizePiece } from './geometry'

export const BOX_WIDTH = 1200
export const BOX_HEIGHT = 2000

/**
 * The panels a box is made of, as ordinary pieces tagged with its id. Ids are
 * fixed per role (`<box>:left`, …), so rebuilding keeps the same pieces.
 *
 * - `between`: the sides run full height; top and bottom fit between them.
 * - `on`: top and bottom run full width; the sides fit between them.
 *
 * The back panel covers the whole back, and the other panels stand in front
 * of it, so the box's outside depth is `depth` including the back.
 */
export function boxPanels(box: Box, thickness: Thickness): Piece[] {
  const t = thickness.body
  const inner = Math.max(1, box.depth - thickness.back)
  const between = box.joint === 'between'
  const sideY = between ? box.y : box.y + t
  const sideHeight = between ? box.height : box.height - 2 * t
  const flatX = between ? box.x + t : box.x
  const flatWidth = between ? box.width - 2 * t : box.width

  const panel = (role: string, piece: Omit<Piece, 'id' | 'boxId'>): Piece =>
    normalizePiece({ ...piece, id: `${box.id}:${role}`, boxId: box.id }, thickness)

  return [
    panel('back', {
      kind: 'back',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      depth: 0,
    }),
    panel('left', {
      kind: 'vertical',
      x: box.x,
      y: sideY,
      width: t,
      height: sideHeight,
      depth: inner,
    }),
    panel('right', {
      kind: 'vertical',
      x: box.x + box.width - t,
      y: sideY,
      width: t,
      height: sideHeight,
      depth: inner,
    }),
    panel('bottom', {
      kind: 'horizontal',
      x: flatX,
      y: box.y,
      width: flatWidth,
      height: t,
      depth: inner,
    }),
    panel('top', {
      kind: 'horizontal',
      x: flatX,
      y: box.y + box.height - t,
      width: flatWidth,
      height: t,
      depth: inner,
    }),
  ]
}

/** Keeps a box big enough to hold its own boards, in whole mm, above the floor. */
export function normalizeBox(box: Box, thickness: Thickness): Box {
  const min = 2 * thickness.body + 1
  return {
    ...box,
    x: Math.round(box.x),
    y: Math.max(0, Math.round(box.y)),
    width: Math.max(min, Math.round(box.width)),
    height: Math.max(min, Math.round(box.height)),
    depth: Math.max(thickness.back + 1, Math.round(box.depth)),
    joint: box.joint === 'on' ? 'on' : 'between',
  }
}

/**
 * Replaces a box's panels with freshly worked-out ones, in the same places in
 * the list, so the parts list and drawing order don't shuffle on every resize.
 */
export function rebuildBox(pieces: Piece[], box: Box, thickness: Thickness) {
  const panels = new Map(boxPanels(box, thickness).map((panel) => [panel.id, panel]))
  const rebuilt = pieces.flatMap((piece) => {
    if (piece.boxId !== box.id) return [piece]
    const panel = panels.get(piece.id)
    panels.delete(piece.id)
    // A panel's colour is its own, not the box's, so it survives a rebuild.
    return panel ? [piece.color ? { ...panel, color: piece.color } : panel] : []
  })
  return [...rebuilt, ...panels.values()]
}

/** Every box's panels rebuilt, and panels of boxes that no longer exist dropped. */
export function withBoxPanels(pieces: Piece[], boxes: Box[], thickness: Thickness) {
  const ids = new Set(boxes.map((box) => box.id))
  const kept = pieces.filter((piece) => !piece.boxId || ids.has(piece.boxId))
  return boxes.reduce((list, box) => rebuildBox(list, box, thickness), kept)
}
