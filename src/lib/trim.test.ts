import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { cutList } from './cutList'
import { autoBands, autoGrain } from './edges'
import { depthStart, findClashes, normalizePiece } from './geometry'

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
