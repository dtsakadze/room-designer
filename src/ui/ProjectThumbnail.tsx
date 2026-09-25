import { EDGE_FILLS, FILLS } from '../canvas/colors'
import { isHollow, showsEdge } from '../canvas/views'
import { contentBounds } from '../lib/geometry'
import type { Piece } from '../types'

const SIZE = 60

/**
 * A small front view of a project, in its parts' colours, for the project
 * list. Same look as the canvas, minus the grid, labels and measurements.
 */
export function ProjectThumbnail({ pieces }: { pieces: Piece[] }) {
  const bounds = contentBounds(pieces)
  if (!bounds) return <div className="project-thumbnail project-thumbnail-empty" />

  const margin = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.06
  const x = bounds.minX - margin
  const y = -(bounds.maxY + margin)
  const w = bounds.maxX - bounds.minX + margin * 2
  const h = bounds.maxY - bounds.minY + margin * 2
  // See-through panels underneath, like on the canvas.
  const ordered = [
    ...pieces.filter((piece) => isHollow(piece, 'front')),
    ...pieces.filter((piece) => !isHollow(piece, 'front')),
  ]

  return (
    <svg
      className="project-thumbnail"
      width={SIZE}
      height={SIZE}
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
          fill={piece.color ?? (showsEdge(piece, 'front') ? EDGE_FILLS : FILLS)[piece.kind]}
          fillOpacity={isHollow(piece, 'front') ? 0.35 : 1}
          stroke="#9c8f6d"
          strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
