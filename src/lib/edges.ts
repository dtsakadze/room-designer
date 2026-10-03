import type { Dimension, Edge, Piece, PieceKind } from '../types'

/** Every edge name, in the order they're listed and stored. */
export const EDGES: Edge[] = ['front', 'back', 'top', 'bottom', 'left', 'right']

export const EDGE_LABELS: Record<Edge, string> = {
  front: 'Front',
  back: 'Back',
  top: 'Top',
  bottom: 'Bottom',
  left: 'Left',
  right: 'Right',
}

/** The dimension each edge faces along. */
const FACING: Record<Edge, Dimension> = {
  left: 'width',
  right: 'width',
  top: 'height',
  bottom: 'height',
  front: 'depth',
  back: 'depth',
}

const DIMENSIONS: Dimension[] = ['width', 'height', 'depth']

/** Which way the grain runs, in words, for each dimension it can run along. */
export const GRAIN_LABELS: Record<Dimension, string> = {
  width: 'Left to right',
  height: 'Up and down',
  depth: 'Front to back',
}

/** The two dimensions of a board's face: everything but its thickness. */
export const faceDimensions = (axis: Dimension) => DIMENSIONS.filter((d) => d !== axis)

/**
 * The four edges of a board whose thickness runs along `axis`. The two sides
 * facing along it are its faces, not edges.
 */
export const boardEdges = (axis: Dimension) => EDGES.filter((edge) => FACING[edge] !== axis)

/** The dimension an edge runs along: neither the board's thickness nor the way the edge faces. */
export const edgeRunsAlong = (edge: Edge, axis: Dimension) =>
  DIMENSIONS.find((d) => d !== axis && d !== FACING[edge])!

/**
 * The edges a part usually gets banded: the ones that show once it's built.
 * That's the front edge of the carcass, shelves, dividers and front rails,
 * and every edge of a door. Back panels, plinths and back rails are hidden.
 */
export function autoBands(piece: Pick<Piece, 'kind' | 'railAt'>): Edge[] {
  switch (piece.kind) {
    case 'vertical':
    case 'divider':
    case 'horizontal':
    case 'shelf':
      return ['front']
    case 'rail':
      return piece.railAt === 'back' ? [] : ['front']
    case 'door':
      return ['top', 'bottom', 'left', 'right']
    default:
      return []
  }
}

/**
 * The way a part's grain usually runs: along the part's length as it stands,
 * so it follows the unit's lines. Up and down on sides, dividers, backs and
 * doors; left to right on tops, shelves, plinths and rails, and on drawer
 * fronts, so a stack of drawers reads as a row of boards. Null for parts that
 * aren't boards.
 */
export function autoGrain(kind: PieceKind): Dimension | null {
  switch (kind) {
    case 'vertical':
    case 'divider':
    case 'back':
    case 'door':
      return 'height'
    case 'horizontal':
    case 'shelf':
    case 'plinth':
    case 'rail':
    case 'drawer':
      return 'width'
    default:
      return null
  }
}

/** A board part's banded edges: its own choice, or the usual ones. */
export const bandsOf = (piece: Pick<Piece, 'kind' | 'railAt' | 'bands'>) =>
  piece.bands ?? autoBands(piece)

/** The way a part's grain runs: its own choice, or the usual way. */
export const grainOf = (piece: Pick<Piece, 'kind' | 'grain'>) => piece.grain ?? autoGrain(piece.kind)

export const isEdge = (value: unknown): value is Edge =>
  typeof value === 'string' && (EDGES as string[]).includes(value)

export const isDimension = (value: unknown): value is Dimension =>
  typeof value === 'string' && (DIMENSIONS as string[]).includes(value)
