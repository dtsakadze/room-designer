import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { HANDLE_SIZE, handleOutsets } from './handles'
import { toSvgY } from './view'

const FILLS: Record<Piece['kind'], string> = {
  vertical: '#d8c9a3',
  horizontal: '#d8c9a3',
  back: '#e6ddc6',
  shelf: '#e0cfa8',
  divider: '#d3bf93',
  rod: '#aab5c2',
  drawer: '#c4ab7e',
}

type PieceRectProps = {
  piece: Piece
  selected: boolean
  unit: number
  onPointerDown: (event: ReactPointerEvent<SVGRectElement>, piece: Piece) => void
}

export function PieceRect({ piece, selected, unit, onPointerDown }: PieceRectProps) {
  const y = toSvgY(piece.y, piece.height)
  // Clear the top row of resize handles, which sit outside a thin piece.
  const box = HANDLE_SIZE * unit
  const labelY = y - handleOutsets(piece, box).y - box / 2 - unit * 5
  // The back panel sits behind everything else, so draw it hollow.
  const isBack = piece.kind === 'back'

  return (
    <g>
      <rect
        x={piece.x}
        y={y}
        width={piece.width}
        height={piece.height}
        rx={piece.kind === 'rod' ? Math.min(piece.width, piece.height) / 2 : 0}
        fill={FILLS[piece.kind]}
        fillOpacity={isBack ? 0.35 : 1}
        stroke={selected ? '#2563eb' : '#9c8f6d'}
        strokeWidth={unit * (selected ? 2.4 : 1)}
        strokeDasharray={isBack ? `${unit * 8} ${unit * 6}` : undefined}
        style={{ cursor: 'move' }}
        onPointerDown={(event) => onPointerDown(event, piece)}
      />
      {selected && (
        <text
          x={piece.x + piece.width / 2}
          y={labelY}
          textAnchor="middle"
          fontSize={unit * 16}
          fill="#2563eb"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {piece.kind === 'rod'
            ? `⌀${piece.height} × ${piece.width}`
            : `${piece.width} × ${piece.height}`}
        </text>
      )}
    </g>
  )
}
