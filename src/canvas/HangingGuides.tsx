import { HANGING_GUIDES } from '../lib/defaults'
import { clearanceBelow } from '../lib/geometry'
import type { Piece } from '../types'
import { CLASH } from './colors'
import { useUnits } from '../store/useSettingsStore'
import { toSvgY } from './view'

const FITS = '#4d7c5a'
/** Matches the canvas background, so labels stay legible over grid lines. */
const HALO = '#f4f6f9'

/**
 * Dashed lines below a selected hanging rod, showing how far shirts and coats
 * hang. A line turns red when something (a shelf, a panel, the floor) is in
 * the way, so you can see at a glance whether the clothes would fit.
 */
type HangingGuidesProps = {
  rod: Piece
  pieces: Piece[]
  unit: number
}

export function HangingGuides({ rod, pieces, unit }: HangingGuidesProps) {
  const clearance = clearanceBelow(rod, pieces)
  const { len } = useUnits()

  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {HANGING_GUIDES.map(({ label, length }) => {
        const fits = clearance >= length
        const color = fits ? FITS : CLASH
        const y = toSvgY(rod.y - length, 0)
        return (
          <g key={label}>
            <line
              x1={rod.x}
              y1={y}
              x2={rod.x + rod.width}
              y2={y}
              stroke={color}
              strokeWidth={unit * 1.4}
              strokeDasharray={`${unit * 6} ${unit * 4}`}
            />
            <text
              x={rod.x + rod.width / 2}
              y={y - unit * 5}
              textAnchor="middle"
              fontSize={unit * 13}
              fill={color}
              stroke={HALO}
              strokeWidth={unit * 3}
              paintOrder="stroke"
            >
              {fits ? `${label} ~${len(length)}` : `${label} ~${len(length)}: doesn't fit`}
            </text>
          </g>
        )
      })}
    </g>
  )
}
