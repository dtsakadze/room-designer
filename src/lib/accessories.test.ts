import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { ACCESSORIES, ACCESSORY_LABELS, DEFAULT_THICKNESS, accessoryDefaults, pieceLabel } from './defaults'
import { cutList, describeHardware, hardwareList } from './cutList'
import { faceColor } from '../canvas/colors'
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
const accessory = (id: string, type: Piece['accessory'], rect: Partial<Piece> = {}) =>
  piece(id, 'accessory', { x: -282, width: 564, height: 200, depth: 450, accessory: type, ...rect })

describe('accessories', () => {
  it('are always a known type, a basket when not, and only accessories have one', () => {
    expect(accessory('a', 'tie').accessory).toBe('tie')
    expect(accessory('b', undefined).accessory).toBe('basket')
    expect(accessory('c', 'jacuzzi' as never).accessory).toBe('basket')
    expect(piece('d', 'shelf', { accessory: 'tie' })).not.toHaveProperty('accessory')
  })

  it('start at the size of their type, and are named for it', () => {
    for (const { type, width, height, depth, label } of ACCESSORIES) {
      expect(accessoryDefaults(type)).toEqual({ accessory: type, width, height, depth })
      expect(pieceLabel(accessory('x', type))).toBe(label)
    }
    expect(ACCESSORY_LABELS['shoes-angled']).toBe('Angled shoe shelf')
  })

  it('start at the front of the unit, and clash only with what they overlap', () => {
    const basket = accessory('a', 'basket', { y: 100 })
    const zStart = wallDepthStart([...unit, basket], thickness)
    // Flush with the front of a 500 deep unit, not against the back.
    expect(zStart(basket)).toBe(500 - basket.depth)
    const above = accessory('b', 'basket', { y: 400 })
    expect(findClashes([...unit, basket, above], thickness).size).toBe(0)
    expect(findClashes([...unit, basket, { ...above, y: 250 }], thickness).size).toBe(2)
  })

  it('are left out of the cut list, and listed by type, width and depth in the hardware', () => {
    const pieces = [
      accessory('a', 'basket', { y: 0 }),
      accessory('b', 'basket', { y: 300 }),
      accessory('c', 'trouser', { y: 600, width: 500, depth: 450 }),
      accessory('d', 'shoes-angled', { y: 800, depth: 350 }),
    ]
    expect(cutList(pieces, thickness)).toEqual([])
    const rows = hardwareList(pieces, thickness).filter((row) => row.item === 'accessories')
    expect(rows).toEqual([
      { item: 'accessories', accessory: 'basket', width: 564, depth: 450, quantity: 2 },
      { item: 'accessories', accessory: 'shoes-angled', width: 564, depth: 350, quantity: 1 },
      { item: 'accessories', accessory: 'trouser', width: 500, depth: 450, quantity: 1 },
    ])
    expect(describeHardware(rows[0], (mm) => `${mm}`).name).toBe('Pull-out wire basket, 564 wide × 450 deep')
  })

  it('have a tint and a short name each, different from the others', () => {
    expect(new Set(ACCESSORIES.map((a) => a.short)).size).toBe(ACCESSORIES.length)
    const tints = ACCESSORIES.map((a) => faceColor(accessory('x', a.type), { boardColors: {} }))
    expect(new Set(tints).size).toBe(ACCESSORIES.length)
    // A colour of the part's own wins over its type's.
    expect(faceColor({ ...accessory('y', 'tie'), color: '#112233' }, { boardColors: {} })).toBe('#112233')
  })
})
