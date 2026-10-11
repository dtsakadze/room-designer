import { describe, expect, it } from 'vitest'
import type { Box, Piece, PieceKind } from '../types'
import { boxPanels } from './box'
import { DEFAULT_THICKNESS } from './defaults'
import { backFixings, carcassScrews, handleChoice, handlePatch, hasHandle, jointHardware, openerHardware, tippingUnits, antiTipBrackets, feetNeeded } from './fixings'
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
    expect(openerHardware(pieces).find((row) => row.item === 'handles')?.quantity).toBe(1 + 2 + 1)
    expect(pieces.filter(hasHandle).map((p) => p.id)).toEqual(['a', 'b', 'd'])
  })

  it('stores a handle taken off on doors and drawers only', () => {
    expect(piece('a', 'door', { noHandle: true }).noHandle).toBe(true)
    expect(piece('a', 'door', { noHandle: false })).not.toHaveProperty('noHandle')
    expect(piece('g', 'shelf', { noHandle: true })).not.toHaveProperty('noHandle')
  })
})

describe('joint hardware', () => {
  const panels = boxPanels(box('between'), thickness)
  const fixed = piece('f', 'shelf', { x: -582, y: 900, width: 1164, height: 18, depth: 580, fixed: true })

  it('is screws as before: carcass screws, and four for each fixed shelf', () => {
    expect(jointHardware([...panels, fixed], 'screws')).toEqual([
      { item: 'shelf-screws', quantity: 4 },
      { item: 'carcass-screws', quantity: 12 },
    ])
  })

  it('is the same number of confirmat screws, in one row', () => {
    expect(jointHardware([...panels, fixed], 'confirmat')).toEqual([
      { item: 'confirmat-screws', quantity: 16 },
    ])
  })

  it('is cam locks and bolts, with two dowels each: one in a narrow joint, two in a deep one', () => {
    // Four deep carcass joints and a fixed shelf's two: two locks each.
    expect(jointHardware([...panels, fixed], 'cam')).toEqual([
      { item: 'cam-locks', quantity: 12 },
      { item: 'cam-bolts', quantity: 12 },
      { item: 'dowels', quantity: 24 },
    ])
    const narrow = [piece('s', 'vertical', { x: 0, width: 18, height: 700, depth: 250 }), piece('r', 'rail', { x: 18, y: 0, width: 400, height: 18, depth: 100 })]
    expect(jointHardware(narrow, 'cam')[0]).toEqual({ item: 'cam-locks', quantity: 1 })
  })

  it('is nothing without joints', () => {
    for (const joints of ['screws', 'confirmat', 'cam'] as const) {
      expect(jointHardware([], joints).every((row) => row.quantity === 0)).toBe(true)
    }
  })
})

describe('anti-tip brackets', () => {
  it('count two for each tall unit: a box is one unit', () => {
    const tall = boxPanels(box('between'), thickness)
    expect(tippingUnits(tall)).toBe(1)
    expect(antiTipBrackets(tall)).toBe(2)
    // Two boxes side by side are two units.
    const next = boxPanels({ ...box('between'), id: 'c', x: 600 }, thickness)
    expect(antiTipBrackets([...tall, ...next])).toBe(4)
  })

  it('leave out low units, and count a top whichever way it meets the sides', () => {
    expect(tippingUnits(boxPanels({ ...box('between'), height: 600 }, thickness))).toBe(0)
    expect(tippingUnits(boxPanels({ ...box('between'), height: 701 }, thickness))).toBe(1)
    expect(tippingUnits(boxPanels(box('on'), thickness))).toBe(1)
  })

  it('count a carcass built from loose panels once, not its bottom or shelves, and only on its own wall', () => {
    const loose = [
      piece('l', 'vertical', { x: 0, width: 18, height: 2000, depth: 580 }),
      piece('r', 'vertical', { x: 582, width: 18, height: 2000, depth: 580 }),
      piece('bottom', 'horizontal', { x: 18, y: 0, width: 564, height: 18, depth: 580 }),
      piece('top', 'horizontal', { x: 18, y: 1982, width: 564, height: 18, depth: 580 }),
      piece('middle', 'horizontal', { x: 18, y: 1000, width: 564, height: 18, depth: 580 }),
      piece('shelf', 'shelf', { x: 18, y: 500, width: 564, height: 18, depth: 580 }),
    ]
    expect(tippingUnits(loose)).toBe(1)
    expect(tippingUnits([...loose, ...loose.map((p) => ({ ...p, id: `${p.id}2`, wall: 'left' as const }))])).toBe(2)
  })

  it('don’t take a middle board for a top because a divider stops under it', () => {
    const unit = [
      piece('l', 'vertical', { x: 0, width: 18, height: 2000, depth: 580 }),
      piece('r', 'vertical', { x: 582, width: 18, height: 2000, depth: 580 }),
      piece('top', 'horizontal', { x: 18, y: 1982, width: 564, height: 18, depth: 580 }),
      piece('middle', 'horizontal', { x: 18, y: 982, width: 564, height: 18, depth: 580 }),
      piece('d', 'divider', { x: 291, y: 18, width: 18, height: 964, depth: 580 }),
    ]
    expect(tippingUnits(unit)).toBe(1)
  })
})

describe('what doors and drawers are opened with', () => {
  it('keeps each choice only where it can apply', () => {
    expect(piece('a', 'door', { handle: 'knob' }).handle).toBe('knob')
    expect(piece('b', 'door', { handle: 'push' }).handle).toBe('push')
    // Nothing to open with: the choice is dropped. Push is for hinged doors only.
    expect(piece('c', 'door', { handle: 'bar', noHandle: true })).not.toHaveProperty('handle')
    expect(piece('d', 'drawer', { handle: 'push' })).not.toHaveProperty('handle')
    expect(piece('e', 'door', { handle: 'push', sliding: 2 })).not.toHaveProperty('handle')
    expect(piece('f', 'drawer', { handle: 'bar', close: 'push' })).not.toHaveProperty('handle')
    expect(piece('g', 'shelf', { handle: 'bar' })).not.toHaveProperty('handle')
    expect(piece('h', 'door', { handle: 'gold' as never })).not.toHaveProperty('handle')
  })

  it('counts each kind to buy: handles, bar handles, knobs, latches, and profile by length', () => {
    const pieces = [
      piece('a', 'door', { width: 600 }),
      piece('b', 'door', { width: 603, double: true, handle: 'knob' }),
      piece('c', 'drawer', { width: 564, height: 200, handle: 'bar' }),
      piece('d', 'door', { handle: 'push' }),
      piece('e', 'drawer', { width: 564, height: 200, handle: 'profile' }),
      piece('f', 'door', { width: 600, handle: 'profile', double: true }),
      piece('g', 'door', { noHandle: true }),
    ]
    const rows = openerHardware(pieces)
    const quantity = (item: string) => rows.filter((row) => row.item === item).reduce((n, row) => n + row.quantity, 0)
    expect(quantity('handles')).toBe(1)
    expect(quantity('knobs')).toBe(2)
    expect(quantity('bar-handles')).toBe(1)
    expect(quantity('push-latches')).toBe(1)
    // The drawer's front, and both leaves of the double door.
    expect(rows.filter((row) => row.item === 'j-profile').map((row) => (row as { length: number }).length)).toEqual([564, 298, 298])
  })
})

describe('adjustable feet', () => {
  const raised = (y: number, patch: Partial<Box> = {}) => boxPanels({ ...box('between'), y, ...patch }, thickness)

  it('go under a unit lifted off the floor, by the gap: a foot at each end of two rows, one more every 600 mm', () => {
    // 1200 wide: three along each of two rows.
    expect(feetNeeded(raised(100))).toEqual([{ height: 100, quantity: 6 }])
    expect(feetNeeded(raised(100, { width: 600 }))).toEqual([{ height: 100, quantity: 4 }])
    expect(feetNeeded(raised(100, { width: 1201 }))).toEqual([{ height: 100, quantity: 8 }])
    expect(feetNeeded(boxPanels({ ...box('on'), y: 80 }, thickness))).toEqual([{ height: 80, quantity: 6 }])
  })

  it('need none on a unit that sits on the floor, or hangs higher than 300 mm up', () => {
    expect(feetNeeded(raised(0))).toEqual([])
    expect(feetNeeded(raised(300)).length).toBe(1)
    expect(feetNeeded(raised(301))).toEqual([])
  })

  it('count each unit by its own gap, and a carcass built from loose panels once, by its bottom', () => {
    const next = boxPanels({ ...box('between'), id: 'c', x: 700, y: 150, width: 600 }, thickness)
    expect(feetNeeded([...raised(100), ...next])).toEqual([
      { height: 100, quantity: 6 },
      { height: 150, quantity: 4 },
    ])
    const loose = [
      piece('l', 'vertical', { x: 0, y: 100, width: 18, height: 1800, depth: 580 }),
      piece('r', 'vertical', { x: 582, y: 100, width: 18, height: 1800, depth: 580 }),
      piece('bottom', 'horizontal', { x: 18, y: 100, width: 564, height: 18, depth: 580 }),
      piece('middle', 'horizontal', { x: 18, y: 1000, width: 564, height: 18, depth: 580 }),
      piece('top', 'horizontal', { x: 18, y: 1882, width: 564, height: 18, depth: 580 }),
    ]
    expect(feetNeeded(loose)).toEqual([{ height: 100, quantity: 4 }])
  })

  it('need none for a unit standing on its sides, even with a divider on its raised bottom', () => {
    const unit = [
      piece('l', 'vertical', { x: 0, width: 18, height: 2000, depth: 580 }),
      piece('r', 'vertical', { x: 582, width: 18, height: 2000, depth: 580 }),
      piece('bottom', 'horizontal', { x: 18, y: 80, width: 564, height: 18, depth: 580 }),
      piece('d', 'divider', { x: 291, y: 98, width: 18, height: 1000, depth: 580 }),
    ]
    expect(feetNeeded(unit)).toEqual([])
  })

  it('only count a unit’s own wall’s sides', () => {
    const left = raised(100).map((p) => ({ ...p, wall: 'left' as const }))
    expect(feetNeeded([...raised(100), ...left])).toEqual([
      { height: 100, quantity: 6 },
      { height: 100, quantity: 6 },
    ])
  })
})

describe('handle choice', () => {
  it('stores a handle or knob as nothing, a chosen one by type, and none as taken off', () => {
    const door = piece('d', 'door')
    expect(handleChoice(door)).toBe('handle')
    expect(handlePatch('handle')).toEqual({ noHandle: false, handle: undefined })
    expect(handlePatch('bar')).toEqual({ noHandle: false, handle: 'bar' })
    expect(handlePatch('none')).toEqual({ noHandle: true, handle: undefined })
    for (const choice of ['handle', 'bar', 'knob', 'profile', 'push', 'none'] as const) {
      expect(handleChoice({ ...door, ...handlePatch(choice) })).toBe(choice)
    }
  })
})
