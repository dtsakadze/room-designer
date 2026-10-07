import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { cutList } from './cutList'
import { autoBands, autoGrain } from './edges'
import { DEFAULT_ROOM } from './room'
import {
  depthSpan,
  depthStart,
  findClashes,
  normalizePiece,
  pieceSolids,
  slidingLaneSpacing,
} from './geometry'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 100, height: 100, depth: 0, ...rect }, thickness)

// A 600 wide, 1000 high unit, 500 deep including its back panel.
const unit = [
  piece('back', 'back', { x: -300, width: 600, height: 1000 }),
  piece('left', 'vertical', { x: -300, height: 1000, depth: 497 }),
  piece('right', 'vertical', { x: 282, height: 1000, depth: 497 }),
  piece('top', 'horizontal', { x: -282, y: 982, width: 564, depth: 497 }),
]

describe('trim', () => {
  it('is a board of the front thickness, whatever depth it was given', () => {
    expect(piece('c', 'cornice', { depth: 40 }).depth).toBe(thickness.front)
    expect(piece('f', 'filler', { depth: 40 }).depth).toBe(thickness.front)
  })

  it('sits flush with the front of the unit, without clashing with it', () => {
    const cornice = piece('c', 'cornice', { x: -300, y: 1000, width: 600, height: 80 })
    const filler = piece('f', 'filler', { x: 300, width: 40, height: 1000 })
    const all = [...unit, cornice, filler]
    const zStart = depthStart(all, thickness)
    expect(zStart(cornice)).toBe(500 - thickness.front)
    expect(zStart(filler)).toBe(500 - thickness.front)
    expect(findClashes(all, thickness).size).toBe(0)
  })

  it('goes in its own cut list section, with the right banding and grain', () => {
    const groups = cutList(
      [piece('c', 'cornice', { width: 1200, height: 80 }), piece('f', 'filler', { width: 40, height: 2000 })],
      thickness,
    )
    expect(groups.map((group) => group.section)).toEqual(['trim'])
    expect(groups[0].rows.map((row) => row.label)).toEqual(['Cornice', 'Filler strip'])
    expect(autoBands({ kind: 'cornice' })).toEqual(['bottom', 'left', 'right'])
    expect(autoBands({ kind: 'filler' })).toEqual([])
    expect(autoGrain('filler')).toBe('height')
    expect(autoGrain('cornice')).toBe('width')
  })
})

describe('front-to-back position (z)', () => {
  const shelf = (z?: number) => piece('s', 'shelf', { x: -282, y: 400, width: 564, depth: 400, ...(z === undefined ? {} : { z }) })

  it('puts a part where it says, and leaves the rest automatic', () => {
    const zStart = depthStart([...unit, shelf(120)], thickness)
    expect(zStart(shelf(120))).toBe(120)
    expect(depthStart([...unit, shelf()], thickness)(shelf())).toBe(thickness.back)
  })

  it('keeps it a whole number, not below the wall, and drops it when absent', () => {
    expect(piece('a', 'shelf', { z: 12.6 }).z).toBe(13)
    expect(piece('b', 'shelf', { z: -5 }).z).toBe(0)
    expect(piece('c', 'shelf', { z: undefined })).not.toHaveProperty('z')
  })

  it('moves the front of the unit, so doors follow a box moved forward', () => {
    const forward = unit.map((p) => ({ ...p, z: (p.z ?? (p.kind === 'back' ? 0 : thickness.back)) + 50 }))
    const door = piece('d', 'door', { x: -300, width: 600, height: 1000 })
    expect(depthStart([...forward, door], thickness)(door)).toBe(550)
  })

  it('clashes only where the parts really meet front to back', () => {
    const a = piece('a', 'shelf', { x: 0, y: 500, width: 300, depth: 100, z: 0 })
    const b = piece('b', 'shelf', { x: 100, y: 500, width: 300, depth: 100, z: 200 })
    expect(findClashes([a, b], thickness).size).toBe(0)
    expect(findClashes([a, { ...b, z: 50 }], thickness).size).toBe(2)
  })
})

describe('sliding door lanes', () => {
  const set = piece('s', 'door', { x: -300, width: 600, height: 1000, sliding: 2 })

  it('stand in two lanes front to back, so overlapping panels do not clash', () => {
    expect(findClashes([...unit, set], thickness).size).toBe(0)
    const spacing = slidingLaneSpacing(set)
    const zs = pieceSolids(set, 500, thickness, DEFAULT_ROOM).map((box) => box.min[2])
    expect(zs).toEqual([500 + spacing, 500])
  })

  it('count both lanes in the side and top views', () => {
    expect(depthSpan(set)).toBe(set.depth + slidingLaneSpacing(set))
    expect(depthSpan(piece('d', 'door', { sliding: undefined }))).toBe(thickness.front)
  })
})
