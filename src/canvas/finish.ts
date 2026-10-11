import type { BoardKey, Edge, Piece } from '../types'
import { WALL_FRAMES, wallOf } from '../lib/room'
import { type DesignColors, faceColor } from './colors'

/**
 * How a solid in the 3D view is coloured: its face colour, the faces of its
 * box that are banded edges with their banding colour (only when the board
 * has one), and the room axis its grain runs along, if it shows grain.
 */
export type Finish = { face: string; edge: string | null; bandedFaces: number[]; grainAxis: number | null }

export function finishOf(
  piece: Piece,
  board: BoardKey | null,
  bands: Edge[],
  colors: DesignColors,
  grainAxis: number | null,
): Finish {
  const face = faceColor(piece, colors, board)
  const edge = (board && colors.edgeColors[board]) || null
  if (!edge || bands.length === 0) return { face, edge: null, bandedFaces: [], grainAxis }
  const faces = boxFaces(piece)
  return { face, edge, bandedFaces: bands.map((band) => faces[band]), grainAxis }
}

/**
 * Which face of a `BoxGeometry` (its material groups: +x, -x, +y, -y, +z, -z)
 * each edge of a part faces in the room: its right edge faces along its wall,
 * its front edge out from it.
 */
export function boxFaces(piece: Pick<Piece, 'wall'>): Record<Edge, number> {
  const { along, out } = WALL_FRAMES[wallOf(piece)]
  // A direction on the floor plan is along the room's x or z.
  const face = ([x, z]: [number, number]) => (x !== 0 ? (x > 0 ? 0 : 1) : z > 0 ? 4 : 5)
  const opposite = (index: number) => index ^ 1
  const right = face(along)
  const front = face(out)
  return { right, left: opposite(right), top: 2, bottom: 3, front, back: opposite(front) }
}
