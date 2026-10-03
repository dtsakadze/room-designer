import { openingHeights, openings } from '../lib/drawing'
import { contentBounds } from '../lib/geometry'
import { useUnits } from '../store/useSettingsStore'
import type { Piece } from '../types'
import { toSvgY } from './view'
import { type ViewName, drawOrder, isHollow, showsEdge } from './views'

const INK = '#111'

type PrintDrawingProps = {
  /** The parts as the view shows them (see `projectPieces`, `roomPlan`). */
  pieces: Piece[]
  view: ViewName
  /** Drawn at 1:`scale`. */
  scale: number
  /** The paper it's drawn on, in mm. */
  area: { width: number; height: number }
}

/**
 * One view drawn to scale for printing, in black on white: boards outlined
 * (cut edges shaded, see-through panels and doors left open), with the
 * overall width and height, and from the front the clear openings between
 * the sides and the clear heights inside each.
 */
export function PrintDrawing({ pieces, view, scale, area }: PrintDrawingProps) {
  const { num } = useUnits()
  const bounds = contentBounds(pieces)
  if (!bounds) return null

  // One mm of paper, in design mm.
  const mm = scale
  const width = area.width * mm
  const height = area.height * mm
  const middleX = (bounds.minX + bounds.maxX) / 2
  const middleY = toSvgY((bounds.minY + bounds.maxY) / 2, 0)
  // Doors would hide what's inside, and their sizes are in the cut list.
  const inside = pieces.filter((piece) => piece.kind !== 'door')
  const columns = view === 'front' ? openings(inside) : []

  return (
    <svg
      className="print-drawing"
      width={`${area.width}mm`}
      height={`${area.height}mm`}
      viewBox={`${middleX - width / 2} ${middleY - height / 2} ${width} ${height}`}
    >
      {drawOrder(pieces, view).map((piece) => {
        const door = view === 'front' && piece.kind === 'door'
        return (
          <rect
            key={piece.id}
            x={piece.x}
            y={toSvgY(piece.y, piece.height)}
            width={piece.width}
            height={piece.height}
            fill={door || isHollow(piece, view) ? 'none' : showsEdge(piece, view) ? '#d4d4d4' : '#f2f2f2'}
            stroke={INK}
            strokeWidth={0.2 * mm}
            strokeDasharray={door ? `${2 * mm} ${1.2 * mm}` : undefined}
          />
        )
      })}

      <Dimension axis="x" from={bounds.minX} to={bounds.maxX} at={bounds.minY - 14 * mm} reach={bounds.minY} mm={mm} label={num(bounds.maxX - bounds.minX)} />
      <Dimension axis="y" from={bounds.minY} to={bounds.maxY} at={bounds.minX - 14 * mm} reach={bounds.minX} mm={mm} label={num(bounds.maxY - bounds.minY)} />
      {columns.map((column) => (
        <Dimension
          key={`w|${column.from}|${column.to}`}
          axis="x"
          from={column.from}
          to={column.to}
          at={bounds.minY - 7 * mm}
          reach={bounds.minY}
          mm={mm}
          label={num(column.to - column.from)}
        />
      ))}
      {columns.flatMap((column) =>
        openingHeights(inside, column).map((gap) => (
          <Dimension
            key={`h|${column.from}|${gap.from}|${gap.to}`}
            axis="y"
            from={gap.from}
            to={gap.to}
            at={(column.from + column.to) / 2}
            mm={mm}
            label={num(gap.to - gap.from)}
          />
        )),
      )}
    </svg>
  )
}

type DimensionProps = {
  axis: 'x' | 'y'
  /** Where it starts and ends along its axis, in design mm. */
  from: number
  to: number
  /** Where the line runs: a design y for an x dimension, an x for a y one. */
  at: number
  /** Where extension lines run back to, if the line stands off the drawing. */
  reach?: number
  mm: number
  label: string
}

/**
 * A dimension line in drafting style: thin, with slashes at its ends,
 * extension lines back to what it measures, and the size above (or, for a
 * height, left of) the line.
 */
function Dimension({ axis, from, to, at, reach, mm, label }: DimensionProps) {
  const slash = 1.2 * mm
  const text = 2.6 * mm
  const stroke = { stroke: INK, strokeWidth: 0.15 * mm }
  if (axis === 'x') {
    const y = toSvgY(at, 0)
    return (
      <g>
        {reach !== undefined &&
          [from, to].map((x) => (
            <line key={x} x1={x} y1={toSvgY(reach, 0) + mm} x2={x} y2={y + mm} {...stroke} />
          ))}
        <line x1={from} y1={y} x2={to} y2={y} {...stroke} />
        {[from, to].map((x) => (
          <line key={`s${x}`} x1={x - slash / 2} y1={y + slash / 2} x2={x + slash / 2} y2={y - slash / 2} {...stroke} />
        ))}
        <text x={(from + to) / 2} y={y - 0.8 * mm} fontSize={text} textAnchor="middle" fill={INK}>
          {label}
        </text>
      </g>
    )
  }
  const [top, bottom] = [toSvgY(to, 0), toSvgY(from, 0)]
  return (
    <g>
      {reach !== undefined &&
        [top, bottom].map((y) => <line key={y} x1={reach - mm} y1={y} x2={at - mm} y2={y} {...stroke} />)}
      <line x1={at} y1={top} x2={at} y2={bottom} {...stroke} />
      {[top, bottom].map((y) => (
        <line key={`s${y}`} x1={at - slash / 2} y1={y + slash / 2} x2={at + slash / 2} y2={y - slash / 2} {...stroke} />
      ))}
      <text
        x={at - 0.8 * mm}
        y={(top + bottom) / 2}
        fontSize={text}
        textAnchor="middle"
        fill={INK}
        transform={`rotate(-90 ${at - 0.8 * mm} ${(top + bottom) / 2})`}
      >
        {label}
      </text>
    </g>
  )
}
