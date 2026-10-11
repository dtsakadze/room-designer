import { type Rect, contentBounds } from '../lib/geometry'

/** The visible window onto the drawing, in mm, in SVG coordinates (y grows down). */
export type ViewBox = { x: number; y: number; w: number; h: number }

/** Roughly a 3.2m wide window showing the floor and a bit of headroom. */
export const INITIAL_VIEW: ViewBox = { x: -1600, y: -2300, w: 3200, h: 2600 }

export const MIN_VIEW_WIDTH = 200
export const MAX_VIEW_WIDTH = 40000

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * The view zoomed by `factor` (above 1 shows more), keeping `anchor` (an SVG
 * point, such as the cursor) where it is on screen. The width stays within
 * the zoom limits.
 */
export function zoomAround(view: ViewBox, anchor: { x: number; y: number }, factor: number): ViewBox {
  const w = clamp(view.w * factor, MIN_VIEW_WIDTH, MAX_VIEW_WIDTH)
  const ratio = w / view.w
  return { w, h: view.h * ratio, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio }
}

/** A view framing these rectangles (in design coordinates) with `margin` mm around them; the starting view for none. */
export function fitView(rects: Rect[], margin = 300): ViewBox {
  const bounds = contentBounds(rects)
  if (!bounds) return INITIAL_VIEW
  return {
    x: bounds.minX - margin,
    y: toSvgY(bounds.minY, bounds.maxY - bounds.minY) - margin,
    w: Math.max(MIN_VIEW_WIDTH, bounds.maxX - bounds.minX + margin * 2),
    h: Math.max(MIN_VIEW_WIDTH, bounds.maxY - bounds.minY + margin * 2),
  }
}

/**
 * Design coordinates count y UP from the floor, SVG counts y down. Every
 * conversion between the two lives here.
 */
export const toSvgY = (y: number, height: number) => -(y + height)
export const toDesignY = (svgY: number) => -svgY

/** Screen point -> SVG user units, using a matrix frozen at gesture start. */
export function svgPoint(inverse: DOMMatrix, clientX: number, clientY: number) {
  return new DOMPoint(clientX, clientY).matrixTransform(inverse)
}

export function screenToSvgMatrix(svg: SVGSVGElement): DOMMatrix | null {
  return svg.getScreenCTM()?.inverse() ?? null
}

/**
 * Wheel delta -> zoom factor.
 *
 * The factor has to scale with the size of the delta, not just its sign: a
 * trackpad fires a stream of tiny events per swipe, so a flat step per event
 * makes it race away. ZOOM_SPEED is tuned for roughly 7% per mouse notch
 * (deltaY ≈ 120), which leaves a trackpad swipe gentle.
 */
const ZOOM_SPEED = 0.0006
/** Caps one event, so a flung trackpad or a chunky mouse can't jump the view. */
const MAX_STEP = 0.22
/** deltaMode 1 counts lines and 2 counts pages; normalise both to pixels. */
const LINE_PX = 16
const PAGE_PX = 400

export function wheelZoomFactor(event: WheelEvent) {
  const toPixels = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? PAGE_PX : 1
  const exponent = event.deltaY * toPixels * ZOOM_SPEED
  return Math.exp(Math.min(Math.max(exponent, -MAX_STEP), MAX_STEP))
}
