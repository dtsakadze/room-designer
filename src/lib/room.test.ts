import { describe, expect, it } from 'vitest'
import type { Piece, Room } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { findClashes } from './geometry'
import {
  adjacentWalls,
  activeWalls,
  clampRoomSize,
  fromWall,
  hasSideWalls,
  isSideWall,
  layoutOf,
  roomBox,
  unfold,
  wallLength,
  wallOf,
} from './room'

const room: Room = { left: true, right: true, width: 2000, depth: 1600 }

/** A 100 wide, 1000 tall, 500 deep block standing on the floor. */
const block = (id: string, x: number, wall?: Piece['wall']): Piece => ({
  id,
  kind: 'drawer',
  x,
  y: 0,
  width: 100,
  height: 1000,
  depth: 500,
  ...(wall ? { wall } : {}),
})

describe('roomBox', () => {
  it('leaves the back wall in its own coordinates', () => {
    expect(roomBox(block('a', -50), 0, room)).toEqual({ min: [-50, 0, 0], max: [50, 1000, 500] })
  })

  it('turns the left wall: its right end is the back corner', () => {
    // At the right end of the left wall, against it.
    const box = roomBox(block('a', 700, 'left'), 0, room)
    expect(box).toEqual({ min: [-1000, 0, 0], max: [-500, 1000, 100] })
  })

  it('turns the right wall: its left end is the back corner', () => {
    const box = roomBox(block('a', -800, 'right'), 0, room)
    expect(box).toEqual({ min: [500, 0, 0], max: [1000, 1000, 100] })
  })

  it('comes back to the wall it was seen from', () => {
    for (const wall of ['back', 'left', 'right'] as const) {
      const piece = block('a', 120, wall === 'back' ? undefined : wall)
      expect(fromWall(roomBox(piece, 0, room), wall, room)).toEqual({
        x: 120,
        y: 0,
        width: 100,
        height: 1000,
        // Against the wall it stands on.
        distance: 0,
      })
    }
  })
})

describe('walls', () => {
  it('lists the walls in use, left to right', () => {
    expect(activeWalls({ ...room, left: false })).toEqual(['back', 'right'])
  })

  it('treats the side walls as next to the back wall, not to each other', () => {
    expect(adjacentWalls('back', room)).toEqual(['left', 'right'])
    expect(adjacentWalls('left', room)).toEqual(['back'])
  })

  it('unfolds the side walls either side of the back wall', () => {
    const [left, back, right] = unfold(
      [block('l', 0, 'left'), block('b', 0), block('r', 0, 'right')],
      room,
    )
    expect(left.x).toBe(-1800)
    expect(back.x).toBe(0)
    expect(right.x).toBe(1800)
  })
})

describe('findClashes across walls', () => {
  it('finds units that run into each other in a corner', () => {
    // A back-wall block in the left corner, and a left-wall block in the back corner.
    const pieces = [block('back', -1000), block('side', 700, 'left')]
    expect(findClashes(pieces, DEFAULT_THICKNESS, room)).toEqual(new Set(['back', 'side']))
  })

  it('lets a side unit stop where the back unit ends', () => {
    // The back unit is 500 deep, so the side unit starts 500 out from the back wall.
    const pieces = [block('back', -1000), block('side', 200, 'left')]
    expect(findClashes(pieces, DEFAULT_THICKNESS, room).size).toBe(0)
  })

  it("doesn't mix up parts that share a position on different walls", () => {
    const pieces = [block('back', 0), block('side', 0, 'left')]
    expect(findClashes(pieces, DEFAULT_THICKNESS, room).size).toBe(0)
  })
})

describe('room basics', () => {
  it('names the layout from the walls in use', () => {
    expect(layoutOf({ ...room, left: false, right: false })).toBe('one')
    expect(layoutOf({ ...room, right: false })).toBe('l')
    expect(layoutOf({ ...room, left: false })).toBe('l')
    expect(layoutOf(room)).toBe('u')
    expect(hasSideWalls({ ...room, left: false, right: false })).toBe(false)
  })

  it('measures the back wall across the room and the side walls along it', () => {
    expect(wallLength(room, 'back')).toBe(2000)
    expect(wallLength(room, 'left')).toBe(1600)
  })

  it('keeps room sizes whole and within 0.5 to 20 m', () => {
    expect(clampRoomSize(2400.4)).toBe(2400)
    expect(clampRoomSize(10)).toBe(500)
    expect(clampRoomSize(50000)).toBe(20000)
    expect(clampRoomSize(Number.NaN)).toBe(500)
  })

  it('reads a missing wall as the back wall, and only left and right as side walls', () => {
    expect(wallOf({})).toBe('back')
    expect(wallOf({ wall: 'right' })).toBe('right')
    expect(['left', 'right'].every(isSideWall)).toBe(true)
    expect(['back', 'front', undefined].some(isSideWall)).toBe(false)
  })
})
