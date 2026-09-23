import type { ViewBox } from './view'

const MINOR = 100
const MAJOR = 1000
/** Below this many mm per line the minor grid turns into mush, so drop it. */
const MINOR_LIMIT = 9000

/**
 * Grid lines are emitted for the visible range only, with widths scaled to the
 * view so they stay hairline-thin however far you zoom.
 */
export function GridLayer({ view }: { view: ViewBox }) {
  const unit = view.w / 1400
  const showMinor = view.w < MINOR_LIMIT

  return (
    <g>
      {showMinor && (
        <g stroke="#dde3ec" strokeWidth={unit}>
          {ticks(view.x, view.w, MINOR).map((x) => (
            <line key={`vm${x}`} x1={x} y1={view.y} x2={x} y2={view.y + view.h} />
          ))}
          {ticks(view.y, view.h, MINOR).map((y) => (
            <line key={`hm${y}`} x1={view.x} y1={y} x2={view.x + view.w} y2={y} />
          ))}
        </g>
      )}

      <g stroke="#c4cedb" strokeWidth={unit * 1.4}>
        {ticks(view.x, view.w, MAJOR).map((x) => (
          <line key={`vM${x}`} x1={x} y1={view.y} x2={x} y2={view.y + view.h} />
        ))}
        {ticks(view.y, view.h, MAJOR).map((y) => (
          <line key={`hM${y}`} x1={view.x} y1={y} x2={view.x + view.w} y2={y} />
        ))}
      </g>

      {/* The floor: y = 0 in design space. */}
      <line
        x1={view.x}
        y1={0}
        x2={view.x + view.w}
        y2={0}
        stroke="#8c9bad"
        strokeWidth={unit * 2.5}
      />
    </g>
  )
}

function ticks(start: number, length: number, spacing: number) {
  const first = Math.ceil(start / spacing) * spacing
  const result: number[] = []
  for (let value = first; value <= start + length; value += spacing) result.push(value)
  return result
}
