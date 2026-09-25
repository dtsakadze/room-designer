import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { HANDLE_SIZE, handleOutsets } from './handles'
import { EDGE_FILLS, FILLS } from './colors'
import { toSvgY } from './view'

type PieceRectProps = {
  piece: Piece
  selected: boolean
  hovered: boolean
  /** Size shown above the piece while it's selected. */
  label: string
  /** Only the front view can move pieces, so only it shows the move cursor. */
  editable: boolean
  /** Drawn see-through, for a panel that would otherwise hide everything else. */
  hollow: boolean
  /** A board seen edge-on, drawn darker than a board's face. */
  edgeOn: boolean
  unit: number
  onPointerDown: (event: ReactPointerEvent<SVGRectElement>, piece: Piece) => void
  onHoverChange: (id: string | null) => void
}

export function PieceRect({
  piece,
  selected,
  hovered,
  label,
  editable,
  hollow,
  edgeOn,
  unit,
  onPointerDown,
  onHoverChange,
}: PieceRectProps) {
  const y = toSvgY(piece.y, piece.height)
  // Clear the top row of resize handles, which sit outside a thin piece.
  const box = HANDLE_SIZE * unit
  const labelY = y - handleOutsets(piece, box).y - box / 2 - unit * 5
  // Selection already has its own outline, so hover only shows on the others.
  const showHover = hovered && !selected
  const rx = piece.kind === 'rod' ? Math.min(piece.width, piece.height) / 2 : 0
  const handlers = {
    onPointerDown: (event: ReactPointerEvent<SVGRectElement>) => onPointerDown(event, piece),
    onPointerEnter: () => onHoverChange(piece.id),
    onPointerLeave: () => onHoverChange(null),
  }

  return (
    <g>
      <rect
        x={piece.x}
        y={y}
        width={piece.width}
        height={piece.height}
        rx={rx}
        fill={(edgeOn ? EDGE_FILLS : FILLS)[piece.kind]}
        fillOpacity={hollow ? 0.35 : 1}
        stroke={selected ? '#2563eb' : showHover ? '#60a5fa' : '#9c8f6d'}
        strokeWidth={unit * (selected ? 2.4 : showHover ? 1.8 : 1)}
        strokeDasharray={hollow ? `${unit * 8} ${unit * 6}` : undefined}
        style={{ cursor: editable ? 'move' : 'pointer', pointerEvents: hollow ? 'none' : undefined }}
        {...(hollow ? {} : handlers)}
      />
      {/* A see-through panel covers the parts inside it, so only a band along
          its outline takes clicks; clicks inside reach those parts. */}
      {hollow && (
        <rect
          x={piece.x}
          y={y}
          width={piece.width}
          height={piece.height}
          fill="none"
          stroke="transparent"
          strokeWidth={unit * 10}
          style={{ cursor: editable ? 'move' : 'pointer', pointerEvents: 'stroke' }}
          {...handlers}
        />
      )}
      {showHover && (
        <rect
          x={piece.x}
          y={y}
          width={piece.width}
          height={piece.height}
          rx={rx}
          fill="#2563eb"
          fillOpacity={0.08}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {selected && (
        <text
          x={piece.x + piece.width / 2}
          y={labelY}
          textAnchor="middle"
          fontSize={unit * 16}
          fill="#2563eb"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}
