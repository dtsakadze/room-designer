import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { HANDLES, type Handle, handleCursor, handleKey } from './handles'
import { toSvgY } from './view'

/** Handle box size, in screen-constant units. */
const SIZE = 11
/** Minimum spread between the three handles on an axis, as handle boxes. */
const SPREAD = 2.6

type ResizeHandlesProps = {
  piece: Piece
  unit: number
  onPointerDown: (event: ReactPointerEvent<SVGRectElement>, handle: Handle) => void
}

export function ResizeHandles({ piece, unit, onPointerDown }: ResizeHandlesProps) {
  const box = SIZE * unit
  const svgTop = toSvgY(piece.y, piece.height)
  const svgBottom = toSvgY(piece.y, 0)

  // An 18mm board is thinner than the handles themselves, so on a short axis the
  // outer handles sit just outside the piece rather than on top of each other.
  const outsetX = Math.max(0, (box * SPREAD - piece.width) / 2)
  const outsetY = Math.max(0, (box * SPREAD - piece.height) / 2)

  return (
    <g>
      {HANDLES.map((handle) => {
        const cx =
          handle.hx === -1
            ? piece.x - outsetX
            : handle.hx === 1
              ? piece.x + piece.width + outsetX
              : piece.x + piece.width / 2
        const cy =
          handle.hy === 1
            ? svgTop - outsetY
            : handle.hy === -1
              ? svgBottom + outsetY
              : svgTop + piece.height / 2

        return (
          <rect
            key={handleKey(handle)}
            x={cx - box / 2}
            y={cy - box / 2}
            width={box}
            height={box}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={unit * 1.6}
            style={{ cursor: handleCursor(handle) }}
            onPointerDown={(event) => onPointerDown(event, handle)}
          />
        )
      })}
    </g>
  )
}
