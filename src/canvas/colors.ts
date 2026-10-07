import { BOARD } from '../lib/defaults'
import { bandsOf } from '../lib/edges'
import type { BoardColors, BoardKey, Edge, Piece, PieceKind } from '../types'

/** Part colours, shared by the flat views and the 3D preview. */
export const FILLS: Record<PieceKind, string> = {
  vertical: '#d8c9a3',
  horizontal: '#d8c9a3',
  back: '#e6ddc6',
  shelf: '#e0cfa8',
  divider: '#d3bf93',
  rod: '#aab5c2',
  drawer: '#c4ab7e',
  plinth: '#cdbb91',
  rail: '#d8c9a3',
  door: '#cdb68c',
  filler: '#cdb68c',
  cornice: '#cdb68c',
}

export const SELECTED = '#2563eb'
/** Parts that overlap another part. */
export const CLASH = '#dc2626'

/** Darker versions, for a board seen edge-on: its cut edge, not its face. */
export const EDGE_FILLS = Object.fromEntries(
  Object.entries(FILLS).map(([kind, color]) => [kind, darken(color, 0.18)]),
) as Record<PieceKind, string>

function darken(hex: string, amount: number) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `#${channels
    .map((c) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0'))
    .join('')}`
}

/** The board a part is cut from: a drawer counts as its front, and a rod isn't a board. */
export const boardOf = (kind: PieceKind): BoardKey | null =>
  BOARD[kind]?.board ?? (kind === 'drawer' ? 'front' : null)

/** A board's colour when it has none set: the standard look of a part cut from it. */
export const BOARD_FILLS: Record<BoardKey, string> = {
  body: FILLS.vertical,
  back: FILLS.back,
  front: FILLS.door,
  drawer: FILLS.drawer,
}

/** The colours a design sets: per board, and per board's edge banding. */
export type DesignColors = { boardColors: BoardColors; edgeColors: BoardColors }

/**
 * A part's face colour: its own, or its board's, or the standard look. `board`
 * overrides the part's board, for a drawer's boards (its box isn't its front).
 */
export function faceColor(
  piece: Pick<Piece, 'kind' | 'color'>,
  { boardColors }: Pick<DesignColors, 'boardColors'> & Partial<DesignColors>,
  board = boardOf(piece.kind),
) {
  return piece.color ?? (board && boardColors[board]) ?? FILLS[piece.kind]
}

/** The flat views a board can be seen edge-on in. */
export type EdgeView = 'front' | 'back' | 'left' | 'right' | 'top'

/** The edge of a board that faces the viewer in each flat view. */
const FACING: Record<EdgeView, Edge> = {
  front: 'front',
  back: 'back',
  left: 'left',
  right: 'right',
  top: 'top',
}

/**
 * A board seen edge-on in a flat view: its edge banding's colour when the edge
 * facing the viewer is banded and its board has one; otherwise its own colour
 * as is, or its board's colour (or the standard look) darkened, so a cut edge
 * reads differently from a face.
 */
export function edgeOnColor(piece: Piece, view: EdgeView, colors: DesignColors) {
  const board = boardOf(piece.kind)
  const banding = board && colors.edgeColors[board]
  if (banding && BOARD[piece.kind] && bandsOf(piece).includes(FACING[view])) return banding
  if (piece.color) return piece.color
  const boardColor = board && colors.boardColors[board]
  return boardColor ? darken(boardColor, 0.18) : EDGE_FILLS[piece.kind]
}
