import { DOOR_OPEN_ANGLE } from '../lib/defaults'
import { type DoorSwing, swingArc, swingPoint } from '../lib/swing'
import { CLASH, SELECTED } from './colors'
import { toSvgY } from './view'

/**
 * Door swings in the top view: each leaf drawn fully open and the arc its edge
 * sweeps, so you can see the floor a door needs. A swing that runs into a wall
 * or something on another wall is red; a selected door's is blue.
 */
export function DoorSwings({
  swings,
  selected,
  hitting,
  unit,
}: {
  swings: DoorSwing[]
  selected: Set<string>
  /** Doors that hit something as they open. */
  hitting: Set<string>
  unit: number
}) {
  return (
    <g fill="none" strokeWidth={unit} style={{ pointerEvents: 'none' }}>
      {swings.map((swing, index) => {
        const { pivot } = swing
        const open = swingPoint(swing, DOOR_OPEN_ANGLE)
        const arc = swingArc(swing).map((point) => `${point.x},${toSvgY(point.y, 0)}`)
        const stroke = selected.has(swing.id)
          ? SELECTED
          : hitting.has(swing.id)
            ? CLASH
            : '#6f6450'
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
