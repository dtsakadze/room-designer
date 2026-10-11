import type { BoardKey, Dimension, Piece, Wall } from '../types'
import { KINDS } from './defaults'
import { grainOf } from './edges'

/** The views grain lines can be drawn in: the flat ones, where a part's face is a rectangle. */
type GrainView = 'front' | 'back' | 'left' | 'right' | 'top'

/**
 * Which two of a part's dimensions each flat view shows on its face: across
 * (the drawing's x) and up (its y, which is depth in the top view).
 */
const FACE: Record<GrainView, [Dimension, Dimension]> = {
  front: ['width', 'height'],
  back: ['width', 'height'],
  left: ['depth', 'height'],
  right: ['depth', 'height'],
  top: ['width', 'depth'],
}

/**
 * The way the grain lines run on the face a flat view shows of a part, or
 * null: the part has no grain (its board isn't marked as having one, it isn't
 * a board, or it's glass), or its grain runs into the face, so you'd see end
 * grain rather than lines.
 */
export function grainDirection(
  piece: Pick<Piece, 'kind' | 'grain' | 'pane'>,
  view: string,
  grainedBoards: readonly BoardKey[],
): 'horizontal' | 'vertical' | null {
  if (!(view in FACE) || piece.pane) return null
  const board = KINDS[piece.kind].board?.board ?? (piece.kind === 'drawer' ? 'front' : null)
  const grain = grainOf(piece)
  if (!board || !grain || !grainedBoards.includes(board)) return null
  const [across, up] = FACE[view as GrainView]
  return grain === across ? 'horizontal' : grain === up ? 'vertical' : null
}

/**
 * The room axis (0 = x, 1 = y, 2 = z) a part's dimension lies along, for the
 * 3D view: a part on a side wall is turned, so its width runs front to back
 * and its depth across the room.
 */
export function roomAxisOf(dimension: Dimension, wall: Wall) {
  if (dimension === 'height') return 1
  return (dimension === 'width') === (wall === 'back') ? 0 : 2
}
