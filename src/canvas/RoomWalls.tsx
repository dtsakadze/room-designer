import type { Rect } from '../lib/geometry'
import { wallLength } from '../lib/room'
import type { Room, Wall } from '../types'
import type { ViewBox } from './view'
import { toSvgY } from './view'

const WALL_COLOR = '#8c9bad'
const LABEL_COLOR = '#74808f'
const GHOST_COLOR = '#74808f'

/** What's at each end of a wall, as you face it. */
const END_LABELS: Record<Wall, [string, string]> = {
  back: ['Left wall', 'Right wall'],
  left: ['Front of room', 'Back wall'],
  right: ['Back wall', 'Front of room'],
}

type FrontProps = {
  room: Room
  wall: Wall
  view: ViewBox
  unit: number
}

/**
 * The room around a wall's unit in its front view: the walls at both ends,
 * hatched and labelled. Nothing here can be clicked; it's there to design
 * against.
 */
export function RoomWallsFront({ room, wall, view, unit }: FrontProps) {
  const half = wallLength(room, wall) / 2
  const top = view.y
  const bottom = 0
  const [leftLabel, rightLabel] = END_LABELS[wall]
  const spacing = unit * 10
  const label = { fontSize: unit * 13, fill: LABEL_COLOR }

  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <defs>
        <pattern
          id="wall-hatch"
          patternUnits="userSpaceOnUse"
          width={spacing}
          height={spacing}
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={spacing} stroke={WALL_COLOR} strokeWidth={unit} />
        </pattern>
      </defs>

      {/* Clipped to the visible area, so the blocks don't need to be huge. */}
      {view.x < -half && (
        <rect x={view.x} y={top} width={-half - view.x} height={bottom - top} fill="url(#wall-hatch)" />
      )}
      {view.x + view.w > half && (
        <rect x={half} y={top} width={view.x + view.w - half} height={bottom - top} fill="url(#wall-hatch)" />
      )}
      <g stroke={WALL_COLOR} strokeWidth={unit * 2.5}>
        <line x1={-half} y1={top} x2={-half} y2={bottom} />
        <line x1={half} y1={top} x2={half} y2={bottom} />
      </g>

      <text x={-half - unit * 6} y={unit * 18} textAnchor="end" {...label}>
        {leftLabel}
      </text>
      <text x={half + unit * 6} y={unit * 18} textAnchor="start" {...label}>
        {rightLabel}
      </text>
    </g>
  )
}

/**
 * Faint outlines of the units standing on the walls next to this one (see
 * `cornerGhosts`). Drawn over this wall's parts, so where the two overlap in
 * a corner shows; they can't be clicked.
 */
export function CornerGhosts({ ghosts, unit }: { ghosts: (Rect & { id: string })[]; unit: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {ghosts.map((ghost) => (
        <rect
          key={ghost.id}
          x={ghost.x}
          y={toSvgY(ghost.y, ghost.height)}
          width={ghost.width}
          height={ghost.height}
          fill={GHOST_COLOR}
          fillOpacity={0.1}
          stroke={GHOST_COLOR}
          strokeWidth={unit}
          strokeDasharray={`${unit * 4} ${unit * 3}`}
        />
      ))}
    </g>
  )
}

/**
 * The room's outline in the top view: the side walls at either end of the
 * back wall (the floor line along y = 0), and a dashed line where the room
 * opens at the front.
 */
export function RoomWallsPlan({ room, unit }: { room: Room; unit: number }) {
  const half = room.width / 2
  // In the plan, the room's depth runs down the page from the back wall.
  const front = room.depth

  return (
    <g style={{ pointerEvents: 'none' }} stroke={WALL_COLOR} strokeWidth={unit * 2.5}>
      <line x1={-half} y1={0} x2={-half} y2={front} />
      <line x1={half} y1={0} x2={half} y2={front} />
      <line
        x1={-half}
        y1={front}
        x2={half}
        y2={front}
        strokeWidth={unit * 1.2}
        strokeDasharray={`${unit * 8} ${unit * 6}`}
      />
    </g>
  )
}
