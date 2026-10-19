import type { AccessoryType, ApplianceType } from '../types'

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

/** `count` short ticks along the top of the area, for the knobs of an oven or a stove. */
const knobs = ({ x0, y0, x1, y1 }: Area, count: number): Line[] =>
  Array.from({ length: count }, (_, i) => {
    const at = x0 + ((x1 - x0) * (i + 0.5)) / count
    return [at, y0, at, y0 + (y1 - y0) * 0.1]
  })

/** A rectangle's outline as four lines. */
const outline = ({ x0, y0, x1, y1 }: Area): Line[] => [
  [x0, y0, x1, y0],
  [x1, y0, x1, y1],
  [x1, y1, x0, y1],
  [x0, y1, x0, y0],
]

/** The area with `fraction` of its size taken off every side. */
const inset = ({ x0, y0, x1, y1 }: Area, fraction: number): Area => {
  const dx = (x1 - x0) * fraction
  const dy = (y1 - y0) * fraction
  return { x0: x0 + dx, y0: y0 + dy, x1: x1 - dx, y1: y1 - dy }
}

/**
 * What each appliance looks like from the front, as simple lines: a freezer
 * door split off a fridge, a porthole on a washer, a control strip on a
 * dishwasher, a window and knobs on an oven, a window and buttons on a
 * microwave, a hob and knobs on a stove, slats on an air vent. The porthole is
 * a polygon, since marks are only lines.
 */
const APPLIANCE_LINES: Record<ApplianceType, (area: Area) => Line[]> = {
  fridge: ({ x0, y0, x1, y1 }) => {
    const split = y0 + (y1 - y0) * 0.32
    return [[x0, split, x1, split]]
  },
  washer: ({ x0, y0, x1, y1 }) => {
    const [cx, cy] = [(x0 + x1) / 2, y0 + (y1 - y0) * 0.58]
    const r = Math.min(x1 - x0, y1 - y0) * 0.3
    const steps = 16
    const at = (i: number) => (i / steps) * 2 * Math.PI
    return Array.from({ length: steps }, (_, i): Line => [
      cx + r * Math.cos(at(i)),
      cy + r * Math.sin(at(i)),
      cx + r * Math.cos(at(i + 1)),
      cy + r * Math.sin(at(i + 1)),
    ])
  },
  dishwasher: ({ x0, y0, x1, y1 }) => {
    const strip = y0 + (y1 - y0) * 0.12
    return [[x0, strip, x1, strip]]
  },
  oven: (area) => [...knobs(area, 5), ...outline(inset({ ...area, y0: area.y0 + (area.y1 - area.y0) * 0.15 }, 0.15))],
  microwave: ({ x0, y0, x1, y1 }) => {
    const side = x0 + (x1 - x0) * 0.72
    return [
      ...outline(inset({ x0, y0, x1: side, y1 }, 0.15)),
      ...across({ x0: side + (x1 - side) * 0.3, y0: y0 + (y1 - y0) * 0.2, x1: x1 - (x1 - side) * 0.1, y1: y1 - (y1 - y0) * 0.2 }, 3),
    ]
  },
  stove: (area) => [...knobs(area, 4), ...outline(inset({ ...area, y0: area.y0 + (area.y1 - area.y0) * 0.2 }, 0.15))],
  hood: (area) => across(inset(area, 0.2), 4),
}

/** An appliance's lines in an area; one without a type is a fridge. */
export const applianceLines = (type: ApplianceType | undefined, area: Area) => APPLIANCE_LINES[type ?? 'fridge'](area)
