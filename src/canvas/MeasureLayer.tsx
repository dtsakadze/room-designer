import { type Point, type SnapKind, measure } from '../lib/measure'
import { useUnits } from '../store/useSettingsStore'
import { SELECTED } from './colors'
import { toSvgY } from './view'

/** Matches the canvas background, so the reading stays legible over lines. */
const HALO = '#f4f6f9'

type MeasureLayerProps = {
  /** Where the measurement starts, once the first point is clicked. */
  from: Point | null
  /** Where it ends: the second click, or the cursor until then. */
  to: Point | null
  /** The point the cursor would pick, and what it caught on. */
  hover: (Point & { snap: SnapKind }) | null
  unit: number
}

/**
 * A measurement being taken or just taken: the line between the two points,
 * with the distance, and for a slanted line its horizontal and vertical
 * parts, drawn dashed. A ring marks the point the cursor would pick when it
 * has caught on a part.
 */
export function MeasureLayer({ from, to, hover, unit }: MeasureLayerProps) {
  const { len, num } = useUnits()
  const y = (point: Point) => toSvgY(point.y, 0)
  const reading = from && to && measure(from, to)
  const slanted = reading && reading.dx >= 0.5 && reading.dy >= 0.5

  return (
    <g style={{ pointerEvents: 'none' }} stroke={SELECTED} fill={SELECTED}>
      {from && to && (
        <>
          {slanted && (
            <polyline
              points={`${from.x},${y(from)} ${to.x},${y(from)} ${to.x},${y(to)}`}
              fill="none"
              strokeWidth={unit}
              strokeDasharray={`${unit * 4} ${unit * 4}`}
              strokeOpacity={0.6}
            />
          )}
          <line x1={from.x} y1={y(from)} x2={to.x} y2={y(to)} strokeWidth={unit * 1.8} />
        </>
      )}
      {[from, to].map(
        (point, index) =>
          point && <circle key={index} cx={point.x} cy={y(point)} r={unit * 3.5} stroke="none" />,
      )}
      {hover?.snap && (
        <circle cx={hover.x} cy={y(hover)} r={unit * 7} fill="none" strokeWidth={unit * 1.5} />
      )}
      {reading && from && to && (
        <text
          x={(from.x + to.x) / 2}
          y={(y(from) + y(to)) / 2 - unit * 10}
          fontSize={unit * 15}
          fontWeight={600}
          textAnchor="middle"
          stroke={HALO}
          strokeWidth={unit * 4}
          paintOrder="stroke"
        >
          {len(reading.distance)}
          {slanted && ` (↔ ${num(reading.dx)} · ↕ ${num(reading.dy)})`}
        </text>
      )}
    </g>
  )
}
