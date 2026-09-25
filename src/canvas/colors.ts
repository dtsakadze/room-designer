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
  plinth: '#cdbb91',
  rail: '#d8c9a3',
}

export const SELECTED = '#2563eb'

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
