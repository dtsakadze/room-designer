/** The visible window onto the drawing, in mm, in SVG coordinates (y grows down). */
export type ViewBox = { x: number; y: number; w: number; h: number }

/** Roughly a 3.2m wide window showing the floor and a bit of headroom. */
export const INITIAL_VIEW: ViewBox = { x: -1600, y: -2300, w: 3200, h: 2600 }

export const MIN_VIEW_WIDTH = 200
export const MAX_VIEW_WIDTH = 40000

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
