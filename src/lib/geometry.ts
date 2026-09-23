import type { Cabinet, Part } from '../types'
import { toScene } from './units'

export type Size = { width: number; height: number; depth: number }

/** Usable cavity inside the carcass, in mm. */
export function innerSize(cabinet: Cabinet): Size {
  const { width, height, depth, thickness, hasBack } = cabinet
  return {
    width: Math.max(0, width - thickness * 2),
    height: Math.max(0, height - thickness * 2),
    depth: Math.max(0, depth - (hasBack ? thickness : 0)),
  }
}

/**
 * World position (metres) of the inner cavity's min corner. The cabinet is
 * centred on the origin in X/Z with its bottom on the floor; +z is the front,
 * so the back panel eats into the cavity from -z.
 */
export function cavityOrigin(cabinet: Cabinet) {
  const { width, depth, thickness, hasBack } = cabinet
  return {
    x: toScene(-width / 2 + thickness),
    y: toScene(thickness),
    z: toScene(-depth / 2 + (hasBack ? thickness : 0)),
  }
}

/** Centre position (metres) of a part, for a mesh whose geometry is centred. */
export function partToWorld(part: Part, cabinet: Cabinet): [number, number, number] {
  const o = cavityOrigin(cabinet)
  return [
    o.x + toScene(part.x + part.width / 2),
    o.y + toScene(part.y + part.height / 2),
    o.z + toScene(part.z + part.depth / 2),
  ]
}

/** Keep a part no larger than the cavity and fully inside it. */
export function clampPart(part: Part, cabinet: Cabinet): Part {
  const inner = innerSize(cabinet)
  const width = clamp(part.width, 1, inner.width)
  const height = clamp(part.height, 1, inner.height)
  const depth = clamp(part.depth, 1, inner.depth)
  return {
    ...part,
    width,
    height,
    depth,
    x: clamp(part.x, 0, inner.width - width),
    y: clamp(part.y, 0, inner.height - height),
    z: clamp(part.z, 0, inner.depth - depth),
  }
}

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), Math.max(min, max))
}
