import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { HANDLE_SIZE, handleOutsets } from './handles'
import { CLASH, EDGE_FILLS, FILLS } from './colors'
import { toSvgY } from './view'

type PieceRectProps = {
  piece: Piece
  selected: boolean
  /** Shows the size label: only on the clicked panel, not every panel of a box. */
  labelled: boolean
  hovered: boolean
  /** Size shown above the piece while it's selected. */
  label: string
  /** Only the front view can move pieces, so only it shows the move cursor. */
  editable: boolean
  /** Drawn see-through, for a panel that would otherwise hide everything else. */
  hollow: boolean
  /** A board seen edge-on, drawn darker than a board's face. */
  edgeOn: boolean
  /** Marks a fixed shelf with a screw at each end. */
  screws: boolean
  /** Overlaps another part: drawn red. */
  clashing: boolean
  unit: number
  onPointerDown: (event: ReactPointerEvent<SVGRectElement>, piece: Piece) => void
  onHoverChange: (id: string | null) => void
}

/** How far in from each end a fixed shelf's screw marks sit, in mm. */
const SCREW_INSET = 25

export function PieceRect({
  piece,
  selected,
  labelled,
  hovered,
  label,
  editable,
  hollow,
  edgeOn,
  screws,
  clashing,
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
        // A part with its own colour is drawn in just that colour.
        fill={piece.color ?? (edgeOn ? EDGE_FILLS : FILLS)[piece.kind]}
        fillOpacity={hollow ? 0.35 : 1}
        stroke={selected ? '#2563eb' : clashing ? CLASH : showHover ? '#60a5fa' : '#9c8f6d'}
        strokeWidth={unit * (selected ? 2.4 : showHover ? 1.8 : 1)}
        strokeDasharray={hollow ? `${unit * 8} ${unit * 6}` : undefined}
        style={{ cursor: editable ? 'move' : 'pointer' }}
        {...handlers}
      />
      {screws &&
        [piece.x + SCREW_INSET, piece.x + piece.width - SCREW_INSET].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy={y + piece.height / 2}
            r={unit * 2.5}
            fill="#6f6450"
            style={{ pointerEvents: 'none' }}
          />
        ))}
      {clashing && (
        <rect
          x={piece.x}
          y={y}
          width={piece.width}
          height={piece.height}
          rx={rx}
          fill={CLASH}
          fillOpacity={0.3}
          style={{ pointerEvents: 'none' }}
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
      {labelled && (
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
