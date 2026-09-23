import type { Piece, PieceKind } from '../types'

export const PANEL_THICKNESS = 18
export const ROD_DIAMETER = 25

/** Gap left between a new piece and whatever is already on the floor. */
export const PLACEMENT_GAP = 100

/** Dragging and nudging snap to this grid, in mm. */
export const SNAP = 10

export const PIECE_LABELS: Record<PieceKind, string> = {
  vertical: 'Side panel',
  horizontal: 'Top / bottom',
  back: 'Back panel',
  shelf: 'Shelf',
  divider: 'Divider',
  rod: 'Hanging rod',
  drawer: 'Drawer',
}

export const PIECE_GROUPS: { title: string; kinds: PieceKind[] }[] = [
  { title: 'Panels', kinds: ['vertical', 'horizontal', 'back'] },
  { title: 'Fittings', kinds: ['shelf', 'divider', 'rod', 'drawer'] },
]

type Dimensions = Pick<Piece, 'width' | 'height' | 'depth'>

const DIMENSIONS: Record<PieceKind, Dimensions> = {
  vertical: { width: PANEL_THICKNESS, height: 2000, depth: 600 },
  horizontal: { width: 1200, height: PANEL_THICKNESS, depth: 600 },
  back: { width: 1200, height: 2000, depth: PANEL_THICKNESS },
  shelf: { width: 1164, height: PANEL_THICKNESS, depth: 580 },
  divider: { width: PANEL_THICKNESS, height: 1000, depth: 580 },
  rod: { width: 1164, height: ROD_DIAMETER, depth: ROD_DIAMETER },
  drawer: { width: 1164, height: 200, depth: 550 },
}

/** A fresh piece, centred on x = 0 and sitting on the floor. */
export function createPiece(kind: PieceKind, id: string): Piece {
  const size = DIMENSIONS[kind]
  return { id, kind, x: -size.width / 2, y: 0, ...size }
}
