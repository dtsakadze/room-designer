import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { APPLIANCES, APPLIANCE_LABELS, DEFAULT_THICKNESS, applianceDefaults, pieceLabel } from './defaults'
import { cutList, hardwareList } from './cutList'
import { faceColor } from '../canvas/colors'
import { applianceLines } from '../canvas/marks'
import { findClashes, normalizePiece, wallDepthStart } from './geometry'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 100, height: 100, depth: 0, ...rect }, thickness)

// A 600 wide, 1000 high unit, 500 deep including its back panel.
const unit = [
  piece('back', 'back', { x: -300, width: 600, height: 1000 }),
  piece('left', 'vertical', { x: -300, height: 1000, depth: 497 }),
  piece('right', 'vertical', { x: 282, height: 1000, depth: 497 }),
]
const appliance = (id: string, type: Piece['appliance'], rect: Partial<Piece> = {}) =>
  piece(id, 'appliance', { x: 400, width: 600, height: 850, depth: 600, appliance: type, ...rect })

describe('appliances', () => {
  it('are always a known type, a fridge when not, and only appliances have one', () => {
    expect(appliance('a', 'oven').appliance).toBe('oven')
    expect(appliance('b', undefined).appliance).toBe('fridge')
    expect(appliance('c', 'jacuzzi' as never).appliance).toBe('fridge')
    expect(piece('d', 'shelf', { appliance: 'oven' })).not.toHaveProperty('appliance')
  })

  it('start at the size and height of their type, and are named for it', () => {
    for (const { type, width, height, depth, y, label } of APPLIANCES) {
      expect(applianceDefaults(type)).toEqual({ appliance: type, width, height, depth, y })
      expect(pieceLabel(appliance('x', type))).toBe(label)
      expect(APPLIANCE_LABELS[type]).toBe(label)
    }
  })

  it('have a drawing and a tint for every type', () => {
    const area = { x0: 0, y0: 0, x1: 100, y1: 100 }
    for (const { type } of APPLIANCES) {
      expect(applianceLines(type, area).length).toBeGreaterThan(0)
    }
    expect(applianceLines(undefined, area)).toEqual(applianceLines('fridge', area))
    const tints = APPLIANCES.map((a) => faceColor(appliance('x', a.type), { boardColors: {} }))
    expect(new Set(tints).size).toBe(APPLIANCES.length)
    expect(faceColor({ ...appliance('y', 'oven'), color: '#112233' }, { boardColors: {} })).toBe('#112233')
  })

  it('line up with the front of the unit when built in, and stand against the wall otherwise', () => {
    const pieces = [...unit, appliance('dw', 'dishwasher', { depth: 400 }), appliance('fr', 'fridge', { depth: 650 })]
    const start = wallDepthStart(pieces, thickness)
    // The unit is 3 + 497 = 500 deep.
    expect(start(pieces[3])).toBe(100)
    expect(start(pieces[4])).toBe(0)
    // Its own place wins.
    expect(start(appliance('own', 'oven', { z: 40 }))).toBe(40)
  })

  it("don't change how deep the unit is", () => {
    const pieces = [...unit, appliance('fr', 'fridge', { depth: 900 }), appliance('ov', 'oven', { depth: 900 })]
    const start = wallDepthStart(pieces, thickness)
    expect(start(pieces[4])).toBe(0)
    expect(start(unit[0])).toBe(0)
    expect(start(unit[1])).toBe(3)
  })

  it('are flagged when they overlap the unit, and not beside it', () => {
    expect(findClashes([...unit, appliance('in', 'fridge', { x: 100, y: 0, depth: 300 })], thickness)).toEqual(new Set(['in', 'right', 'back']))
    expect(findClashes([...unit, appliance('beside', 'fridge', { x: 400 })], thickness)).toEqual(new Set())
  })

  it('are in neither the cut list nor the hardware list', () => {
    const pieces = [appliance('a', 'oven'), appliance('b', 'fridge')]
    expect(cutList(pieces, thickness)).toEqual([])
    expect(hardwareList(pieces, thickness)).toEqual([])
  })
})
