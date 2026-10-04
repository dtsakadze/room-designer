import type { Rect } from './geometry'

/** A point in a flat view, in design mm (y up). */
export type Point = { x: number; y: number }

/** What a measured point caught on: a part's corner, the middle of an edge, an edge, or nothing. */
export type SnapKind = 'corner' | 'middle' | 'edge' | null

/**
 * Where a click or the cursor lands for measuring: on the nearest corner or
 * edge middle of a part within `threshold` mm, or failing that on the nearest
 * point of a part's edge, so measurements run board to board rather than to
 * wherever the pointer happened to be. Corners and middles win over edges
 * when both are in reach, as they're what one usually means.
 */
export function snapPoint(point: Point, rects: Rect[], threshold: number): Point & { snap: SnapKind } {
  let best: { point: Point; snap: SnapKind; distance: number } | null = null
  const consider = (candidate: Point, snap: SnapKind) => {
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y)
    if (distance > threshold) return
    if (!best || rank(snap) < rank(best.snap) || (rank(snap) === rank(best.snap) && distance < best.distance)) {
      best = { point: candidate, snap, distance }
    }
  }

  for (const rect of rects) {
    const [left, right, bottom, top] = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height]
    for (const x of [left, right]) for (const y of [bottom, top]) consider({ x, y }, 'corner')
    const [midX, midY] = [(left + right) / 2, (bottom + top) / 2]
    for (const middle of [{ x: midX, y: bottom }, { x: midX, y: top }, { x: left, y: midY }, { x: right, y: midY }]) {
      consider(middle, 'middle')
    }
    // The nearest point on each edge.
    const alongX = clamp(point.x, left, right)
    const alongY = clamp(point.y, bottom, top)
    for (const edge of [{ x: alongX, y: bottom }, { x: alongX, y: top }, { x: left, y: alongY }, { x: right, y: alongY }]) {
      consider(edge, 'edge')
    }
  }

  const found = best as { point: Point; snap: SnapKind } | null
  return found ? { ...found.point, snap: found.snap } : { ...point, snap: null }
}

const rank = (snap: SnapKind) => (snap === 'edge' ? 1 : 0)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** A measurement between two points: straight across, and its horizontal and vertical parts, in mm. */
export function measure(from: Point, to: Point) {
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  return { dx, dy, distance: Math.hypot(dx, dy) }
}
