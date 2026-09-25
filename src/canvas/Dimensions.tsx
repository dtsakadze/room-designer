import type { Piece } from '../types'
import { type Gap, contentBounds, neighbourGaps } from '../lib/geometry'
import { useUnits } from '../store/useSettingsStore'
import { toSvgY } from './view'

const OVERALL_COLOR = '#74808f'
const GAP_COLOR = '#2563eb'
/** Matches the canvas background, so labels stay legible over grid lines. */
const HALO = '#f4f6f9'

type DimensionsProps = {
  pieces: Piece[]
  selected: Piece | null
  unit: number
}

/**
 * Measurements drawn on the canvas: the overall size of everything placed,
 * along the top and left, and the clear gaps around the selected piece.
 */
export function Dimensions({ pieces, selected, unit }: DimensionsProps) {
  const { len } = useUnits()
  const bounds = contentBounds(pieces)
  if (!bounds) return null

  // Screen-constant offset, so the overall lines sit just clear of the unit.
  const offset = unit * 36

  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <DimensionLine
        gap={{ axis: 'x', from: bounds.minX, to: bounds.maxX, at: bounds.maxY }}
        offset={offset}
        color={OVERALL_COLOR}
        unit={unit}
        format={len}
      />
      <DimensionLine
        gap={{ axis: 'y', from: bounds.minY, to: bounds.maxY, at: bounds.minX }}
        offset={-offset}
        color={OVERALL_COLOR}
        unit={unit}
        format={len}
      />

      {selected &&
        // Keyed by position: two gaps can share from/to (e.g. to the floor on
        // both sides of a part below), and the lines hold no state to keep.
        neighbourGaps(selected, pieces).map((gap, index) => (
          <DimensionLine
            key={index}
            gap={gap}
            offset={0}
            color={GAP_COLOR}
            unit={unit}
            format={len}
          />
        ))}
    </g>
  )
}

type DimensionLineProps = {
  gap: Gap
  /** How far to push the line off `gap.at`, in design mm (+ is right/up). */
  offset: number
  color: string
  unit: number
  /** Writes the length in the chosen unit. */
  format: (mm: number) => string
}

/** A line with end ticks and its length written across the middle. */
function DimensionLine({ gap, offset, color, unit, format }: DimensionLineProps) {
  const tick = unit * 6
  const at = gap.at + offset
  const length = format(gap.to - gap.from)
  const mid = (gap.from + gap.to) / 2
  const fontSize = unit * 13

  // Everything below is in SVG coordinates, where y grows down.
  const [x1, y1, x2, y2] =
    gap.axis === 'x'
      ? [gap.from, toSvgY(at, 0), gap.to, toSvgY(at, 0)]
      : [at, toSvgY(gap.from, 0), at, toSvgY(gap.to, 0)]
  const ticks =
    gap.axis === 'x'
      ? [x1, x2].map((x) => ({ x1: x, y1: y1 - tick, x2: x, y2: y1 + tick }))
      : [y1, y2].map((y) => ({ x1: x1 - tick, y1: y, x2: x1 + tick, y2: y }))
  const label =
    gap.axis === 'x'
      ? { x: mid, y: y1 - unit * 5, rotate: 0 }
      : { x: x1 - unit * 5, y: toSvgY(mid, 0), rotate: -90 }

  return (
    <g stroke={color} strokeWidth={unit * 1.1}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {ticks.map((t, i) => (
        <line key={i} {...t} />
      ))}
      <text
        x={label.x}
        y={label.y}
        transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
        textAnchor="middle"
        fontSize={fontSize}
        fill={color}
        stroke={HALO}
        strokeWidth={unit * 3}
        paintOrder="stroke"
      >
        {length}
      </text>
    </g>
  )
}
