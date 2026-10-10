import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { ACCESSORIES, SLIDING_TRACK_HEIGHT } from '../lib/defaults'
import { doorLeaves, slidingPanels } from '../lib/geometry'
import { HANDLE_SIZE, handleOutsets } from './handles'
import { ACCESSORY_FILLS, CLASH, PANE_FILLS, SPAN_WARNING } from './colors'
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
  /** Its colour: its face, or for a board seen edge-on its edge (see `faceColor`, `edgeOnColor`). */
  fill: string
  /** Marks a fixed shelf with a screw at each end. */
  screws: boolean
  /** Shows how a door opens: its leaves, and a V pointing at each leaf's hinges. */
  doorMarks: boolean
  /** Overlaps another part: drawn red. */
  clashing: boolean
  /** The way grain lines run on this part's face in this view, or null for none. */
  grain: 'horizontal' | 'vertical' | null
  /** A shelf that spans too far (see `spanWarnings`), a drawer too close to its door (see `clearanceWarnings`), or a part past a wall (see `roomOverhangs`). */
  warned: boolean
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
  fill,
  screws,
  doorMarks,
  clashing,
  warned,
  grain,
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
        fill={fill}
        fillOpacity={hollow ? 0.35 : 1}
        stroke={selected ? '#2563eb' : clashing ? CLASH : warned ? SPAN_WARNING : showHover ? '#60a5fa' : '#9c8f6d'}
        strokeWidth={unit * (selected ? 2.4 : showHover ? 1.8 : warned ? 2.4 : 1)}
        // A door's own marks are dashed, so its outline stays solid.
        strokeDasharray={hollow && piece.kind !== 'door' ? `${unit * 8} ${unit * 6}` : undefined}
        style={{ cursor: editable ? 'move' : 'pointer' }}
        {...handlers}
      />
      {grain && (
        <rect
          x={piece.x}
          y={y}
          width={piece.width}
          height={piece.height}
          rx={rx}
          fill={`url(#grain-${grain})`}
          style={{ pointerEvents: 'none' }}
        />
      )}
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
      {doorMarks && piece.kind === 'accessory' && <AccessoryMarks piece={piece} y={y} unit={unit} />}
      {doorMarks && piece.kind === 'door' && !piece.sliding && piece.pane && (
        <PaneSheen piece={piece} y={y} unit={unit} />
      )}
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
  if (piece.sliding) return <SlidingMarks piece={piece} y={y} unit={unit} />
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

/**
 * A set of sliding doors: the two tracks, and each panel outlined where it
 * runs. Panels in the front lane are drawn over the ones behind.
 */
function SlidingMarks({ piece, y, unit }: { piece: Piece; y: number; unit: number }) {
  const panels = slidingPanels({ ...piece, sliding: piece.sliding! })
  // Back lane first, so the front panels cover the edges of the ones behind.
  const ordered = [...panels].sort((a, b) => b.lane - a.lane)
  return (
    <g style={{ pointerEvents: 'none' }} stroke="#6f6450" strokeWidth={unit}>
      {[y, y + piece.height - SLIDING_TRACK_HEIGHT].map((trackY) => (
        <rect key={trackY} x={piece.x} y={trackY} width={piece.width} height={SLIDING_TRACK_HEIGHT} fill="#8a8068" />
      ))}
      {ordered.map((panel) => (
        <rect
          key={panel.x}
          x={panel.x}
          y={y + SLIDING_TRACK_HEIGHT}
          width={panel.width}
          height={panel.height}
          fill={piece.pane ? PANE_FILLS[piece.pane] : '#e8dcb8'}
          fillOpacity={panel.lane === 0 ? 0.85 : 0.6}
        />
      ))}
      {piece.pane &&
        ordered.map((panel) => (
          <Sheen
            key={`sheen-${panel.x}`}
            id={`${piece.id}-${panel.x}`}
            rect={{ x: panel.x, y: y + SLIDING_TRACK_HEIGHT, width: panel.width, height: panel.height }}
            mirror={piece.pane === 'mirror'}
          />
        ))}
    </g>
  )
}

/** The light on glass or a mirror: each leaf of a double door gets its own. */
function PaneSheen({ piece, y }: { piece: Piece; y: number; unit: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {doorLeaves(piece, piece.double).map((leaf, index) => (
        <Sheen
          key={index}
          id={`${piece.id}-${index}`}
          rect={{ x: leaf.x, y, width: leaf.width, height: piece.height }}
          mirror={piece.pane === 'mirror'}
        />
      ))}
    </g>
  )
}

/** Two slanted bands of light across a pane, clipped to it; stronger on a mirror. */
function Sheen({
  id,
  rect: { x, y, width, height },
  mirror,
}: {
  id: string
  rect: { x: number; y: number; width: number; height: number }
  mirror: boolean
}) {
  const clip = `sheen-${id.replace(/[^a-zA-Z0-9]/g, '-')}`
  const slant = height * 0.35
  const band = (from: number, size: number) =>
    `${x + width * from},${y + height} ${x + width * (from + size)},${y + height} ${x + width * (from + size) + slant},${y} ${x + width * from + slant},${y}`
  return (
    <g style={{ pointerEvents: 'none' }}>
      <clipPath id={clip}>
        <rect x={x} y={y} width={width} height={height} />
      </clipPath>
      <g clipPath={`url(#${clip})`} fill="#fff" fillOpacity={mirror ? 0.6 : 0.4}>
        <polygon points={band(0.1, 0.14)} />
        <polygon points={band(0.34, 0.05)} />
      </g>
    </g>
  )
}

/**
 * What an accessory looks like from the front, as simple lines: bars for a
 * trouser rack, upright hooks for ties and belts, a wire grid for a basket,
 * slats for a shoe rack (slanted on the angled shelf).
 */
function AccessoryMarks({ piece, y, unit }: { piece: Piece; y: number; unit: number }) {
  const pad = Math.min(piece.width, piece.height) * 0.14
  const [x0, x1] = [piece.x + pad, piece.x + piece.width - pad]
  const [y0, y1] = [y + pad, y + piece.height - pad]
  const across = (count: number): [number, number, number, number][] =>
    Array.from({ length: count }, (_, i) => {
      const at = y0 + ((y1 - y0) * i) / (count - 1)
      return [x0, at, x1, at]
    })
  const up = (count: number): [number, number, number, number][] =>
    Array.from({ length: count }, (_, i) => {
      const at = x0 + ((x1 - x0) * i) / (count - 1)
      return [at, y0, at, y1]
    })
  const lines: [number, number, number, number][] =
    piece.accessory === 'trouser'
      ? across(5)
      : piece.accessory === 'tie'
        ? up(9)
        : piece.accessory === 'shoes-pullout'
          ? across(3)
          : piece.accessory === 'shoes-angled'
            ? Array.from({ length: 5 }, (_, i): [number, number, number, number] => {
                const at = x0 + ((x1 - x0) * i) / 4
                return [at, y1, Math.min(x1, at + (x1 - x0) / 8), y0]
              })
            : [...across(4), ...up(10)]
  // The type's name across the middle, when it fits at the size the other labels are.
  const word = ACCESSORIES.find((accessory) => accessory.type === piece.accessory)?.short
  const text = unit * 13
  const fits = !!word && piece.width > word.length * text * 0.62 + pad * 2 && piece.height > text * 1.5
  return (
    <g stroke="#5b6572" strokeWidth={unit} style={{ pointerEvents: 'none' }}>
      {lines.map(([ax, ay, bx, by], index) => (
        <line key={index} x1={ax} y1={ay} x2={bx} y2={by} />
      ))}
      {fits && (
        <text
          x={piece.x + piece.width / 2}
          y={y + piece.height / 2 + text / 3}
          textAnchor="middle"
          fontSize={text}
          fill="#2f3945"
          // A halo in the box's own colour keeps the word clear of the lines behind it.
          stroke={ACCESSORY_FILLS[piece.accessory!]}
          strokeWidth={text / 3}
          paintOrder="stroke"
        >
          {word}
        </text>
      )}
    </g>
  )
}
