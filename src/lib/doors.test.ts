import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS, DOOR_LEAF_GAP } from './defaults'
import { cutList } from './cutList'
import { depthStart, findClashes, neighbourGaps, normalizePiece } from './geometry'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 100, height: 100, depth: 0, ...rect }, thickness)

// A 600 wide, 1000 high unit, 500 deep including its back panel.
const unit = [
  piece('back', 'back', { x: -300, width: 600, height: 1000 }),
  piece('left', 'vertical', { x: -300, height: 1000, depth: 497 }),
  piece('right', 'vertical', { x: 282, height: 1000, depth: 497 }),
  piece('bottom', 'horizontal', { x: -282, width: 564, depth: 497 }),
  piece('top', 'horizontal', { x: -282, y: 982, width: 564, depth: 497 }),
]

describe('doors', () => {
  it('take the body thickness, and keep only their own options', () => {
    const door = piece('d', 'door', { depth: 40, double: true, hinge: 'right', fixed: true })
    expect(door.depth).toBe(thickness.body)
    expect(door).not.toHaveProperty('hinge')
    expect(door).not.toHaveProperty('fixed')
  })

  it('stand in front of the unit (overlay) or flush inside it (inset)', () => {
    const overlay = piece('o', 'door', { x: -300, width: 600, height: 1000 })
    const inset = piece('i', 'door', { x: -280, y: 20, width: 560, height: 960, inset: true })
    const zStart = depthStart([...unit, overlay, inset], thickness)
    expect(zStart(overlay)).toBe(500)
    expect(zStart(inset)).toBe(500 - thickness.body)
  })

  it('clash with the carcass when inset but sized to its outside', () => {
    const inset = piece('i', 'door', { x: -300, width: 600, height: 1000, inset: true })
    expect(findClashes([...unit, inset], thickness).has('i')).toBe(true)
    const overlay = { ...inset, inset: undefined }
    expect(findClashes([...unit, overlay], thickness).size).toBe(0)
  })

  it("aren't in the way of the gap lines of the parts behind them", () => {
    const shelf = piece('shelf', 'shelf', { x: -282, y: 400, width: 564, depth: 400 })
    const door = piece('d', 'door', { x: -300, y: 600, width: 600, height: 400 })
    const up = neighbourGaps(shelf, [...unit, shelf, door]).find(
      (gap) => gap.axis === 'y' && gap.from === shelf.y + shelf.height,
    )
    expect(up?.to).toBe(982)
  })

  it('are cut as two leaves when double', () => {
    const double = piece('d', 'door', { width: 603, height: 2000, double: true })
    expect(cutList([double], thickness)[0].rows).toEqual([
      {
        kind: 'door',
        label: 'Double door leaf',
        quantity: 2,
        length: 2000,
        width: (603 - DOOR_LEAF_GAP) / 2,
        thickness: thickness.body,
        board: 'body',
      },
    ])
  })
})
