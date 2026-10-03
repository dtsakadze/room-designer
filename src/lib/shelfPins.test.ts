import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'
import { clampHolePitch, holeColumns, holeHeights, holeLines, shelfPanels, snapToHoles } from './shelfPins'

const piece = (id: string, kind: PieceKind, rect: Partial<Piece>): Piece =>
  normalizePiece(
    { id, kind, x: 0, y: 0, width: 18, height: 18, depth: 400, ...rect },
    DEFAULT_THICKNESS,
  )

// A unit 600 wide: sides from 100 mm up, a shelf between them.
const left = piece('left', 'vertical', { x: -300, y: 100, height: 2000 })
const right = piece('right', 'vertical', { x: 282, y: 100, height: 2000 })
const shelf = (y: number, patch: Partial<Piece> = {}) =>
  piece('shelf', 'shelf', { x: -282, y, width: 564, ...patch })

describe('shelf pins', () => {
  it('drills holes a pitch apart, from a pitch above a panel’s bottom to a pitch below its top', () => {
    expect(holeHeights({ y: 100, height: 200 }, 32)).toEqual([132, 164, 196, 228, 260])
    expect(holeHeights({ y: 0, height: 50 }, 32)).toEqual([])
  })

  it('finds the panels a shelf’s ends meet, on its own wall', () => {
    expect(shelfPanels(shelf(500), [left, right])).toEqual({ left, right })
    // A shelf cut a little short still rests on them.
    expect(shelfPanels(shelf(500, { x: -280, width: 560 }), [left, right]).left).toBe(left)
    expect(shelfPanels(shelf(500, { x: 400 }), [left, right])).toEqual({ left: null, right: null })
    const onSide = { ...right, wall: 'left' as const }
    expect(shelfPanels(shelf(500), [left, onSide]).right).toBeNull()
  })

  it('moves a shelf to the nearest hole of the panel it rests on', () => {
    // Holes at 132, 164, …, 516, 548.
    expect(snapToHoles(shelf(530), [left, right], 32)).toBe(516)
    expect(snapToHoles(shelf(535), [left, right], 32)).toBe(548)
    // Never below the lowest hole or above the highest.
    expect(snapToHoles(shelf(0), [left, right], 32)).toBe(132)
    expect(snapToHoles(shelf(5000), [left, right], 32)).toBe(2052)
  })

  it('counts holes up from the floor with no panel to rest on', () => {
    expect(snapToHoles(shelf(530), [], 32)).toBe(544)
    expect(snapToHoles(shelf(10), [], 32)).toBe(0)
  })

  it('draws hole lines on the faces adjustable shelves rest on', () => {
    const lines = holeLines([left, right, shelf(516)], 32)
    expect(lines.map((line) => [line.panel.id, line.face])).toEqual([
      ['left', 'right'],
      ['right', 'left'],
    ])
    expect(holeLines([left, right, shelf(516, { fixed: true })], 32)).toEqual([])
  })

  it('drills two columns of holes 37 mm in from the front and back, or one on a shallow panel', () => {
    expect(holeColumns(580)).toEqual([37, 543])
    expect(holeColumns(100)).toEqual([50])
  })

  it('keeps the hole spacing whole and within limits', () => {
    expect(clampHolePitch(32.4)).toBe(32)
    expect(clampHolePitch(2)).toBe(8)
    expect(clampHolePitch(500)).toBe(100)
    expect(clampHolePitch(Number.NaN)).toBe(32)
  })
})
