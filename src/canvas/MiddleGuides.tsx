import type { Gap } from '../lib/geometry'
import { SELECTED } from './colors'
import { toSvgY } from './view'

/**
 * Shows that a dragged part is in the middle of its space: a dashed line
 * along each pair of equal gaps, with an "=" over each gap.
 */
export function MiddleGuides({ gaps, unit }: { gaps: Gap[]; unit: number }) {
  return (
    <g style={{ pointerEvents: 'none' }} stroke={SELECTED} fill={SELECTED}>
      {gaps.map((gap, index) => {
        const middle = (gap.from + gap.to) / 2
        const [x1, y1, x2, y2] =
          gap.axis === 'x'
            ? [gap.from, toSvgY(gap.at, 0), gap.to, toSvgY(gap.at, 0)]
            : [gap.at, toSvgY(gap.from, 0), gap.at, toSvgY(gap.to, 0)]
        // Beside the gap's own measurement, so the two don't overlap.
        const [tx, ty] =
          gap.axis === 'x' ? [middle, toSvgY(gap.at, 0) + unit * 16] : [gap.at + unit * 14, toSvgY(middle, 0)]
        return (
          // Two gaps of a pair can share a position, so the index keeps keys apart.
          <g key={`${index}|${gap.axis}|${gap.from}|${gap.to}|${gap.at}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={unit * 1.5}
              strokeDasharray={`${unit * 5} ${unit * 4}`}
            />
            <text
              x={tx}
              y={ty}
              fontSize={unit * 16}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
              stroke="none"
            >
              =
            </text>
          </g>
        )
      })}
    </g>
  )
}
