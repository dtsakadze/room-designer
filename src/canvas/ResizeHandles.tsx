import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { BOARD } from '../lib/defaults'
import {
  HANDLES,
  HANDLE_SIZE,
  type Handle,
  handleCursor,
  handleKey,
  handleOutsets,
} from './handles'
import { toSvgY } from './view'

type ResizeHandlesProps = {
  piece: Piece
  unit: number
  onPointerDown: (event: ReactPointerEvent<SVGRectElement>, handle: Handle) => void
}

export function ResizeHandles({ piece, unit, onPointerDown }: ResizeHandlesProps) {
  const box = HANDLE_SIZE * unit
  const svgTop = toSvgY(piece.y, piece.height)
  const svgBottom = toSvgY(piece.y, 0)
  const { x: outsetX, y: outsetY } = handleOutsets(piece, box)
  // A board's thickness comes from the project, so don't offer to drag it.
  const locked = BOARD[piece.kind]?.axis
  const handles = HANDLES.filter(
    (handle) =>
      !(locked === 'width' && handle.hx !== 0) && !(locked === 'height' && handle.hy !== 0),
  )

  return (
    <g>
      {handles.map((handle) => {
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
