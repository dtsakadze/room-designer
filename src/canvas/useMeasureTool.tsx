import { type RefObject, useEffect, useState } from 'react'
import type { Piece } from '../types'
import { type Point, type SnapKind, snapPoint } from '../lib/measure'
import { escapeOwnedByOverlay, isFieldTarget, isOverlayOpen } from '../ui/shortcuts'
import { MeasureLayer } from './MeasureLayer'
import { type ViewBox, screenToSvgMatrix, svgPoint, toDesignY } from './view'

/** How near a part's corner or edge a measured point catches on it, in screen pixels (times `unit`). */
const MEASURE_SNAP = 10

/**
 * The Measure tool: while it's on, clicks pick two points to measure between.
 * M turns it on and off; Escape clears a measurement, then turns it off. A
 * measurement belongs to the view it was taken in (`viewKey`): points
 * measured in one view mean nothing in another.
 */
export function useMeasureTool({
  svgRef,
  viewKey,
  canMeasure,
  shown,
  unit,
}: {
  svgRef: RefObject<SVGSVGElement | null>
  viewKey: string
  /** False in the 3D view, which has nothing to measure on. */
  canMeasure: boolean
  /** What the view draws, for points to catch on. */
  shown: Piece[]
  unit: number
}) {
  const [measuring, setMeasuring] = useState(false)
  const [measurement, setMeasurement] = useState<{ view: string; from: Point; to: Point | null } | null>(null)
  const [hover, setHover] = useState<(Point & { snap: SnapKind }) | null>(null)
  const measured = measurement?.view === viewKey ? measurement : null

  const toggle = () => {
    setMeasuring((on) => !on)
    setMeasurement(null)
    setHover(null)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFieldTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() === 'm' && canMeasure && !isOverlayOpen()) {
        event.preventDefault()
        setMeasuring((on) => !on)
        setMeasurement(null)
        setHover(null)
      } else if (event.key === 'Escape' && measuring) {
        if (escapeOwnedByOverlay()) return
        event.preventDefault()
        if (measured) setMeasurement(null)
        else setMeasuring(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canMeasure, measuring, measured])

  /** Where a pointer event lands for measuring: caught on a part's corner or edge, unless Alt is held. */
  const pointAt = (event: { clientX: number; clientY: number; altKey: boolean }) => {
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!inverse) return null
    const point = svgPoint(inverse, event.clientX, event.clientY)
    const raw = { x: point.x, y: toDesignY(point.y) }
    return event.altKey ? { ...raw, snap: null } : snapPoint(raw, shown, unit * MEASURE_SNAP)
  }

  /** The measurement drawn, and a layer over everything that picks the points. */
  const layer = (view: ViewBox) =>
    measuring &&
    canMeasure && (
      <>
        <MeasureLayer
          from={measured?.from ?? null}
          to={measured?.to ?? (measured ? hover : null)}
          hover={hover}
          unit={unit}
        />
        {/* On top of everything, so clicks pick points rather than parts; right-drag still pans. */}
        <rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.stopPropagation()
            const point = pointAt(event)
            if (!point) return
            const { snap: _snap, ...picked } = point
            // From the latest state, so quick clicks each count.
            setMeasurement((current) => {
              const open = current?.view === viewKey && !current.to ? current : null
              return open ? { ...open, to: picked } : { view: viewKey, from: picked, to: null }
            })
          }}
          onPointerMove={(event) => setHover(pointAt(event))}
          onPointerLeave={() => setHover(null)}
        />
      </>
    )

  return { measuring, toggle, layer }
}
