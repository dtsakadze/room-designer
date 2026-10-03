import { describe, expect, it } from 'vitest'
import type { Box, Piece, PieceKind } from '../types'
import { boxPanels } from './box'
import { DEFAULT_THICKNESS } from './defaults'
import { backFixings, carcassScrews, handleCount, hasHandle } from './fixings'
import { normalizePiece } from './geometry'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: PieceKind, rect: Partial<Piece> = {}): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 600, height: 700, depth: 580, ...rect }, thickness)
const box = (joint: Box['joint']): Box => ({ id: 'b', x: -600, y: 0, width: 1200, height: 2000, depth: 600, joint })

describe('carcass screws', () => {
  it('screws each corner of a box, whichever way its top and bottom meet the sides', () => {
    // Four joints, three screws each across a deep carcass.
    expect(carcassScrews(boxPanels(box('between'), thickness))).toBe(12)
    expect(carcassScrews(boxPanels(box('on'), thickness))).toBe(12)
  })

  it('screws a divider standing on the bottom and under the top, and a rail from a side to it', () => {
    const panels = boxPanels(box('between'), thickness)
    const divider = piece('d', 'divider', { x: -9, y: 18, height: 1964 })
    // A rail from the side to the divider is narrow: two screws at each end.
    const rail = piece('r', 'rail', { x: -582, y: 1500, width: 573, depth: 100 })
    expect(carcassScrews([...panels, divider, rail])).toBe(12 + 2 * 3 + 2 * 2)
  })

  it('leaves out parts that don’t touch, and parts on other walls', () => {
    const side = piece('s', 'vertical', { x: -618, width: 18, height: 2000 })
    const shelf = piece('top', 'horizontal', { x: -500, y: 1982, width: 500 })
    expect(carcassScrews([side, shelf])).toBe(0)
    const top = piece('top', 'horizontal', { x: -600, y: 1982, width: 600 })
    expect(carcassScrews([side, top])).toBe(3)
    expect(carcassScrews([side, { ...top, wall: 'left' }])).toBe(0)
  })
})

describe('back fixings', () => {
  it('fixes a back panel about every 150 mm round its edge', () => {
    expect(backFixings([piece('k', 'back', { width: 1200, height: 2000 })])).toBe(43)
    expect(backFixings([piece('s', 'shelf')])).toBe(0)
  })
})

describe('handles', () => {
  it('counts one per door leaf and drawer, unless taken off or push-to-open', () => {
    const pieces = [
      piece('a', 'door'),
      piece('b', 'door', { double: true, width: 1203 }),
      piece('c', 'door', { noHandle: true }),
      piece('d', 'drawer', { height: 200 }),
      piece('e', 'drawer', { height: 200, close: 'push' }),
      piece('f', 'drawer', { height: 200, noHandle: true }),
      piece('g', 'shelf'),
    ]
    expect(handleCount(pieces)).toBe(1 + 2 + 1)
    expect(pieces.filter(hasHandle).map((p) => p.id)).toEqual(['a', 'b', 'd'])
  })

  it('stores a handle taken off on doors and drawers only', () => {
    expect(piece('a', 'door', { noHandle: true }).noHandle).toBe(true)
    expect(piece('a', 'door', { noHandle: false })).not.toHaveProperty('noHandle')
    expect(piece('g', 'shelf', { noHandle: true })).not.toHaveProperty('noHandle')
  })
})
