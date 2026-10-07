import { useUnits } from '../store/useSettingsStore'
import { toSvgY } from './view'
import type { ViewBox } from './view'

const COLOR = '#7c6f9a'
/** Matches the canvas background, so the label stays legible over grid lines. */
const HALO = '#f4f6f9'

/**
 * A dashed line at the room's ceiling in the front view, labelled with its
 * height and how far it is above the highest part of the wall being edited.
 */
type CeilingLineProps = {
  height: number
  /** Top of the highest part on this wall, or null with none. */
  top: number | null
  view: ViewBox
  unit: number
}

export function CeilingLine({ height, top, view, unit }: CeilingLineProps) {
  const { len } = useUnits()
  const y = toSvgY(height, 0)
  const gap = top === null ? null : height - top
  const label =
    gap === null || gap === 0 ? `Ceiling ${len(height)}` : gap > 0 ? `Ceiling ${len(height)}: ${len(gap)} above the unit` : `Ceiling ${len(height)}: the unit is ${len(-gap)} too tall`

  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <line
        x1={view.x}
        y1={y}
        x2={view.x + view.w}
        y2={y}
        stroke={gap !== null && gap < 0 ? '#dc2626' : COLOR}
        strokeWidth={unit * 1.6}
        strokeDasharray={`${unit * 10} ${unit * 5}`}
      />
      <text
        x={view.x + unit * 10}
        y={y - unit * 6}
        fontSize={unit * 13}
        fill={COLOR}
        stroke={HALO}
        strokeWidth={unit * 3}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  )
}
