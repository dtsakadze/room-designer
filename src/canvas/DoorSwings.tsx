import type { DoorSwing } from './views'
import { SELECTED } from './colors'
import { toSvgY } from './view'

/** Points along each quarter circle; plenty for a smooth arc at any zoom. */
const ARC_STEPS = 24

/**
 * Door swings in the top view: each leaf drawn open at a right angle, and the
 * arc its edge sweeps, so you can see the floor a door needs and whether doors
 * in a corner would hit each other. A selected door's swing is blue.
 */
export function DoorSwings({
  swings,
  selected,
  unit,
}: {
  swings: DoorSwing[]
  selected: Set<string>
  unit: number
}) {
  return (
    <g fill="none" strokeWidth={unit} style={{ pointerEvents: 'none' }}>
      {swings.map((swing, index) => {
        const { pivot, closed, open } = swing
        // The leaf and the arm to the open end are square and the same length,
        // so stepping between them traces the quarter circle.
        const arc = Array.from({ length: ARC_STEPS + 1 }, (_, step) => {
          const angle = (step / ARC_STEPS) * (Math.PI / 2)
          const [cos, sin] = [Math.cos(angle), Math.sin(angle)]
          const x = pivot.x + cos * (closed.x - pivot.x) + sin * (open.x - pivot.x)
          const y = pivot.y + cos * (closed.y - pivot.y) + sin * (open.y - pivot.y)
          return `${x},${toSvgY(y, 0)}`
        })
        const stroke = selected.has(swing.id) ? SELECTED : '#6f6450'
        return (
          // Keyed by position too: a double door's two leaves share its id.
          <g key={`${swing.id}-${index}`} stroke={stroke}>
            <line
              x1={pivot.x}
              y1={toSvgY(pivot.y, 0)}
              x2={open.x}
              y2={toSvgY(open.y, 0)}
            />
            <polyline points={arc.join(' ')} strokeDasharray={`${unit * 6} ${unit * 4}`} />
          </g>
        )
      })}
    </g>
  )
}
