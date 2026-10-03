import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { fitScale, openingHeights, openings } from './drawing'
import { normalizePiece } from './geometry'

const piece = (id: string, kind: PieceKind, rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 18, height: 18, depth: 580, ...rect }, DEFAULT_THICKNESS)

// A unit 1200 wide with a divider: openings of 573 and 573.
const left = piece('l', 'vertical', { x: -600, height: 2000 })
const divider = piece('d', 'divider', { x: -9, y: 18, height: 1964 })
const right = piece('r', 'vertical', { x: 582, height: 2000 })
const bottom = piece('b', 'horizontal', { x: -582, width: 1164 })
const top = piece('t', 'horizontal', { x: -582, y: 1982, width: 1164 })

describe('drawing scale', () => {
  it('picks the largest standard scale that fits, with room for dimensions', () => {
    // 1200 × 2000 on 277 × 176 mm of paper, 22 mm round it: at 1:10 it's
    // 200 mm high, too big; at 1:20, 100 mm.
    expect(fitScale({ width: 1200, height: 2000 }, { width: 277, height: 176 }, 22)).toBe(20)
    expect(fitScale({ width: 100, height: 100 }, { width: 277, height: 176 }, 22)).toBe(1)
    expect(fitScale({ width: 1e6, height: 1e6 }, { width: 277, height: 176 }, 22)).toBe(500)
  })
})

describe('dimensions', () => {
  it('measures the clear openings between sides and dividers', () => {
    expect(openings([right, left, divider, top, bottom])).toEqual([
      { from: -582, to: -9 },
      { from: 9, to: 582 },
    ])
  })

  it('measures the clear heights inside an opening, between what runs across it', () => {
    const shelf = piece('s', 'shelf', { x: -582, y: 800, width: 573 })
    const drawer = piece('w', 'drawer', { x: -582, y: 18, width: 573, height: 200 })
    const [leftOpening, rightOpening] = openings([left, divider, right])
    expect(openingHeights([bottom, top, shelf, drawer], leftOpening)).toEqual([
      { from: 218, to: 800 },
      { from: 818, to: 1982 },
    ])
    // The shelf and drawer stop at the divider.
    expect(openingHeights([bottom, top, shelf, drawer], rightOpening)).toEqual([{ from: 18, to: 1982 }])
  })

  it('leaves out gaps too thin to label', () => {
    const drawers = [0, 203].map((y, i) => piece(`w${i}`, 'drawer', { x: -582, y, width: 573, height: 200 }))
    expect(openingHeights(drawers, { from: -582, to: -9 })).toEqual([])
  })
})
