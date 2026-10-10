import { type DesignColors, edgeOnColor, faceColor } from '../canvas/colors'
import { drawOrder, isHollow, showsEdge } from '../canvas/views'
import { contentBounds } from '../lib/geometry'
import { unfold } from '../lib/room'
import type { Piece, Room } from '../types'

const SIZE = 60

/**
 * A small front view of a project, in its parts' colours, for the project
 * list. Same look as the canvas, minus the grid, labels and measurements. A
 * design on several walls is shown unfolded, the walls side by side.
 */
export function ProjectThumbnail({
  pieces: all,
  room,
  colors,
  size = SIZE,
}: {
  pieces: Piece[]
  room: Room
  colors: DesignColors
  /** Width and height in pixels. */
  size?: number
}) {
  const pieces = unfold(all, room)
  const bounds = contentBounds(pieces)
  if (!bounds) {
    return <div className="project-thumbnail project-thumbnail-empty" style={{ width: size, height: size }} />
  }

  const margin = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.06
  const x = bounds.minX - margin
  const y = -(bounds.maxY + margin)
  const w = bounds.maxX - bounds.minX + margin * 2
  const h = bounds.maxY - bounds.minY + margin * 2
  // See-through panels underneath and doors on top, like on the canvas.
  const ordered = drawOrder(pieces, 'front')

  return (
    <svg
      className="project-thumbnail"
      width={size}
      height={size}
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {ordered.map((piece) => (
        <rect
          key={piece.id}
          x={piece.x}
          y={-(piece.y + piece.height)}
          width={piece.width}
          height={piece.height}
          fill={showsEdge(piece, 'front') ? edgeOnColor(piece, 'front', colors) : faceColor(piece, colors)}
          fillOpacity={isHollow(piece, 'front') ? 0.35 : 1}
          stroke="#9c8f6d"
          strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
