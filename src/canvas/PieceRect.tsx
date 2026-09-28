import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { doorLeaves } from '../lib/geometry'
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
  /** Shows how a door opens: its leaves, and a V pointing at each leaf's hinges. */
  doorMarks: boolean
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
  doorMarks,
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
        // A door's own marks are dashed, so its outline stays solid.
        strokeDasharray={hollow && piece.kind !== 'door' ? `${unit * 8} ${unit * 6}` : undefined}
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
      {doorMarks && piece.kind === 'door' && <DoorMarks piece={piece} y={y} unit={unit} />}
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

/**
 * The usual drawing convention for a hinged door: lines from the corners of
 * the side that opens to the middle of the hinged side, so the V points at the
 * hinges. A double door opens in the middle, each leaf hinged on its outer side.
 */
function DoorMarks({ piece, y, unit }: { piece: Piece; y: number; unit: number }) {
  const leaves = doorLeaves(piece, piece.double)
  const mid = y + piece.height / 2
  const bottom = y + piece.height
  const hingedLeft = (index: number) => (piece.double ? index === 0 : piece.hinge !== 'right')
  return (
    <g
      fill="none"
      stroke="#6f6450"
      strokeWidth={unit}
      strokeDasharray={`${unit * 6} ${unit * 4}`}
      style={{ pointerEvents: 'none' }}
    >
      {leaves.map((leaf, index) => {
        const [hinge, open] = hingedLeft(index)
          ? [leaf.x, leaf.x + leaf.width]
          : [leaf.x + leaf.width, leaf.x]
        return (
          <g key={index}>
            {piece.double && (
              <rect x={leaf.x} y={y} width={leaf.width} height={piece.height} strokeDasharray="none" />
            )}
            <polyline points={`${open},${y} ${hinge},${mid} ${open},${bottom}`} />
          </g>
        )
      })}
    </g>
  )
}
