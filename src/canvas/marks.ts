import type { AccessoryType } from '../types'

/** A line from (x1, y1) to (x2, y2), in SVG coordinates. */
export type Line = [number, number, number, number]

/** The area marks are drawn in, in SVG coordinates (y0 the top). */
type Area = { x0: number; y0: number; x1: number; y1: number }

/** `count` lines across the area, evenly spaced from top to bottom. */
const across = ({ x0, y0, x1, y1 }: Area, count: number): Line[] =>
  Array.from({ length: count }, (_, i) => {
    const at = y0 + ((y1 - y0) * i) / (count - 1)
    return [x0, at, x1, at]
  })

/** `count` lines up the area, evenly spaced from left to right. */
const up = ({ x0, y0, x1, y1 }: Area, count: number): Line[] =>
  Array.from({ length: count }, (_, i) => {
    const at = x0 + ((x1 - x0) * i) / (count - 1)
    return [at, y0, at, y1]
  })

/**
 * What each accessory looks like from the front, as simple lines: bars for a
 * trouser rack, upright hooks for ties and belts, a wire grid for a basket,
 * slats for a shoe rack (slanted on the angled shelf).
 */
const ACCESSORY_LINES: Record<AccessoryType, (area: Area) => Line[]> = {
  trouser: (area) => across(area, 5),
  tie: (area) => up(area, 9),
  basket: (area) => [...across(area, 4), ...up(area, 10)],
  'shoes-pullout': (area) => across(area, 3),
  'shoes-angled': ({ x0, y0, x1, y1 }) =>
    Array.from({ length: 5 }, (_, i): Line => {
      const at = x0 + ((x1 - x0) * i) / 4
      return [at, y1, Math.min(x1, at + (x1 - x0) / 8), y0]
    }),
}

/** An accessory's lines in an area; one without a type is a basket. */
export const accessoryLines = (type: AccessoryType | undefined, area: Area) => ACCESSORY_LINES[type ?? 'basket'](area)
