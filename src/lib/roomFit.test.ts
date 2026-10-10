import { describe, expect, it } from 'vitest'
import type { Piece, Room } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'
import { roomOverhangs } from './roomFit'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, rect: Partial<Piece> = {}): Piece =>
  normalizePiece({ id, kind: 'shelf', x: -300, y: 0, width: 600, height: 18, depth: 400, ...rect }, thickness)
const overhangs = (pieces: Piece[], room: Partial<Room>) =>
  roomOverhangs(pieces, thickness, { left: false, right: false, width: 2400, depth: 1800, ...room })

describe('parts past a wall', () => {
  it('has nothing to warn about in a one-wall project, except above a ceiling that is set', () => {
    expect(overhangs([piece('a', { x: -5000, width: 9000 })], {}).size).toBe(0)
    expect(overhangs([piece('a', { y: 2300 })], { height: 2400 }).size).toBe(0)
    // A shelf's height is its thickness, so this one is 18 mm high: its top is at 2418.
    expect(overhangs([piece('a', { y: 2400 })], { height: 2400 }).get('a')).toEqual({ past: 'ceiling', by: 18 })
  })

  it('warns about a part past either side of the room, whichever side walls are on, by how far', () => {
    const wide = piece('a', { x: -1300, width: 400 })
    expect(overhangs([wide], { left: true }).get('a')).toEqual({ past: 'left', by: 100 })
    // The same on the other side, with only the left wall on, and with only the right one on.
    expect(overhangs([wide], { right: true }).get('a')).toEqual({ past: 'left', by: 100 })
    const right = piece('b', { x: 1000, width: 400 })
    expect(overhangs([right], { left: true }).get('b')).toEqual({ past: 'right', by: 200 })
    expect(overhangs([right], { right: true }).get('b')).toEqual({ past: 'right', by: 200 })
    // Touching the wall is fine.
    expect(overhangs([piece('c', { x: -1200, width: 400 })], { left: true }).size).toBe(0)
  })

  it('warns about a part on a side wall that runs through the back wall', () => {
    // On the left wall, x runs towards the front, with the back corner at +x = depth / 2.
    const through = piece('a', { wall: 'left', x: 500, width: 500 })
    expect(overhangs([through], { left: true }).get('a')).toEqual({ past: 'back', by: 100 })
    expect(overhangs([piece('b', { wall: 'left', x: 0, width: 500 })], { left: true }).size).toBe(0)
  })

  it('warns about a unit on a side wall deep enough to reach the other side, and one past the front end', () => {
    const deep = piece('a', { wall: 'left', x: -300, depth: 2500 })
    expect(overhangs([deep], { left: true, right: true }).get('a')).toEqual({ past: 'right', by: 100 })
    expect(overhangs([deep], { left: true }).get('a')).toEqual({ past: 'right', by: 100 })
    // The side walls are 1800 deep; this one stands from 1550 to 1850.
    const long = piece('b', { wall: 'left', x: -950, width: 300 })
    expect(overhangs([long], { left: true }).get('b')).toEqual({ past: 'front', by: 50 })
  })

  it('names the worst when a part sticks out of several', () => {
    // Top at 2468: 68 above the ceiling.
    const both = piece('a', { x: -1300, width: 400, y: 2450 })
    expect(overhangs([both], { left: true, height: 2400 }).get('a')).toEqual({ past: 'left', by: 100 })
    expect(overhangs([{ ...both, x: -1250 }], { left: true, height: 2400 }).get('a')).toEqual({ past: 'ceiling', by: 68 })
  })

  it('counts a set of sliding doors with both lanes', () => {
    const doors = normalizePiece(
      { id: 'd', kind: 'door', x: -300, y: 0, width: 600, height: 2000, depth: 18, sliding: 2, wall: 'left' },
      thickness,
    )
    // Standing in front of a 2 mm deep room it pokes out past the other wall; the point is only that depth includes the lanes.
    expect(overhangs([doors], { left: true, right: true, width: 30 }).get('d')?.past).toBe('right')
  })
})
