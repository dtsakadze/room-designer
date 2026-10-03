import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'
import { doorHinges, hingesPerLeaf } from './hinges'

const thickness = DEFAULT_THICKNESS
const door = (id: string, rect: Partial<Piece> = {}): Piece =>
  normalizePiece(
    { id, kind: 'door', x: 0, y: 0, width: 600, height: 2000, depth: 18, ...rect },
    thickness,
  )
const fits = (doors: Piece[]) => doorHinges(doors, thickness).map((leaf) => [leaf.doorId, leaf.fit])

describe('hinges', () => {
  it('needs more hinges on taller doors', () => {
    expect([700, 900, 901, 1600, 2000, 2400].map(hingesPerLeaf)).toEqual([2, 2, 3, 3, 4, 5])
  })

  it('hinges each leaf of a double door, with its own count', () => {
    const leaves = doorHinges([door('d', { double: true, width: 1203, height: 1500 })], thickness)
    expect(leaves).toEqual([
      { doorId: 'd', count: 3, fit: 'full', angle: 110, softClose: false },
      { doorId: 'd', count: 3, fit: 'full', angle: 110, softClose: false },
    ])
  })

  it('makes two overlay doors hinged on the same panel half overlay', () => {
    // A shared 18 mm panel at 597–615: the left door is hinged on its right
    // edge at 604.5, the right one on its left edge at 607.5.
    const left = door('a', { x: 0, width: 604, hinge: 'right' })
    const right = door('b', { x: 608, width: 600 })
    expect(fits([left, right])).toEqual([
      ['a', 'half'],
      ['b', 'half'],
    ])
    // Hinged away from each other, or one inset: full overlay.
    expect(fits([door('a', { x: 0, width: 604 }), door('b', { x: 608, width: 600, hinge: 'right' })])).toEqual([
      ['a', 'full'],
      ['b', 'full'],
    ])
    expect(fits([left, { ...right, inset: true }])).toEqual([
      ['a', 'full'],
      ['b', 'inset'],
    ])
    // At other heights or on another wall, they don't share the panel.
    expect(fits([left, { ...right, y: 2100 }])).toEqual([
      ['a', 'full'],
      ['b', 'full'],
    ])
    expect(fits([left, { ...right, wall: 'left' }])[0][1]).toBe('full')
  })

  it('carries the door’s opening angle and soft-close', () => {
    const [leaf] = doorHinges([door('d', { openAngle: 155, softClose: true })], thickness)
    expect(leaf).toMatchObject({ angle: 155, softClose: true })
  })
})
