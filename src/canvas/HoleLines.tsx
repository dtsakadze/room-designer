import { holeColumns, holeLines } from '../lib/shelfPins'
import type { Piece } from '../types'
import { toSvgY } from './view'
import type { ViewName } from './views'

const HOLE = '#5a4b2c'
/** A shelf-pin hole is 5 mm across. */
const HOLE_RADIUS = 2.5

type HoleLinesProps = {
  /** The parts on the wall being shown, as they stand (front-view coordinates). */
  pieces: Piece[]
  /** The same parts as the view draws them. */
  shown: Piece[]
  view: ViewName
  pitch: number
  unit: number
}

/**
 * The shelf-pin holes in the sides and dividers that adjustable shelves rest
 * on, so you can see where else a shelf could go. From the front the holes
 * are in the panel's face, out of sight, so each shows as a short tick on
 * the drilled face. From the left or right the face is in view, and the holes
 * show as two columns of dots, near the front and back edges.
 */
export function HoleLines({ pieces, shown, view, pitch, unit }: HoleLinesProps) {
  const lines = holeLines(pieces, pitch)
  if (lines.length === 0) return null

  if (view === 'left' || view === 'right') {
    const projected = new Map(shown.map((piece) => [piece.id, piece]))
    // Dots small enough to look like holes, big enough to see zoomed out.
    const r = Math.max(HOLE_RADIUS, unit * 2)
    return (
      <g style={{ pointerEvents: 'none' }}>
        {lines.map(({ panel, face, heights }) => {
          const side = projected.get(panel.id)
          if (!side) return null
          return holeColumns(side.width).flatMap((column) => {
            // From the left the back is on the left; from the right, mirrored.
            const x = view === 'left' ? side.x + column : side.x + side.width - column
            return heights.map((y) => (
              <circle
                key={`${panel.id}|${face}|${column}|${y}`}
                cx={x}
                cy={toSvgY(y, 0)}
                r={r}
                fill={HOLE}
              />
            ))
          })
        })}
      </g>
    )
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      {lines.map(({ panel, face, heights }) => {
        // Half the panel's thickness: long enough to see, short enough to read as holes.
        const tick = panel.width / 2
        const x = face === 'right' ? panel.x + panel.width : panel.x
        const x2 = face === 'right' ? x - tick : x + tick
        return heights.map((y) => (
          <line
            key={`${panel.id}|${face}|${y}`}
            x1={x}
            y1={toSvgY(y, 0)}
            x2={x2}
            y2={toSvgY(y, 0)}
            stroke={HOLE}
            strokeWidth={unit * 1.5}
          />
        ))
      })}
    </g>
  )
}
