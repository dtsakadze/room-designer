import type { PieceKind } from '../types'

/** Part colours, shared by the flat views and the 3D preview. */
export const FILLS: Record<PieceKind, string> = {
  vertical: '#d8c9a3',
  horizontal: '#d8c9a3',
  back: '#e6ddc6',
  shelf: '#e0cfa8',
  divider: '#d3bf93',
  rod: '#aab5c2',
  drawer: '#c4ab7e',
}

export const SELECTED = '#2563eb'
