import { describe, expect, it } from 'vitest'
import type { Piece, Room } from '../types'
import { DEFAULT_THICKNESS, DOOR_LEAF_GAP, DOOR_OPEN_ANGLE } from './defaults'
import { normalizePiece } from './geometry'
import { doorSwings, swingBounds, swingConflicts, swingPoint } from './swing'

const thickness = DEFAULT_THICKNESS
const room: Room = { left: true, right: true, width: 2400, depth: 1800 }
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}): Piece =>
  normalizePiece(
    { id, kind, x: -300, y: 0, width: 600, height: 2000, depth: 600, ...rect },
    thickness,
  )
// A 600 mm deep side, so a door on the same wall stands in front of it at 600.
const side = (wall?: Piece['wall'], x = -300) =>
  piece(`side-${wall ?? 'back'}-${x}`, 'vertical', { x, width: 18, wall })
const door = (id: string, rect: Partial<Piece> = {}) => piece(id, 'door', rect)
const round = (point: { x: number; y: number }) => ({ x: Math.round(point.x), y: Math.round(point.y) })

describe('door swings', () => {
  const swingsOf = (d: Piece) => doorSwings([side(d.wall), d], thickness, room)

  it('turn a single door on its hinge side, out into the room', () => {
    const [left] = swingsOf(door('d'))
    // The front face is 600 + 18 out from the back wall, which is y = 0.
    expect(left).toMatchObject({
      pivot: { x: -300, y: -618 },
      closed: { x: 300, y: -618 },
      square: { x: -300, y: -1218 },
    })
    const [right] = swingsOf(door('d', { hinge: 'right' }))
    expect(right.pivot).toEqual({ x: 300, y: -618 })
  })

  it('open as far as wide-angle hinges go', () => {
    const [standard] = swingsOf(door('d'))
    expect(standard.angle).toBe(110)
    const [wide] = swingsOf(door('d', { openAngle: 170 }))
    expect(wide.angle).toBe(170)
    // Nearly flat back along the unit: 600 × cos 170° behind the hinge.
    expect(swingBounds(wide).x).toBeCloseTo(-300 - 591, 0)
  })

  it('open to 110°, past square and back behind the hinge side', () => {
    const [swing] = swingsOf(door('d'))
    const open = swingPoint(swing, DOOR_OPEN_ANGLE)
    // 600 × cos 110° behind the hinge, 600 × sin 110° out.
    expect(round(open)).toEqual({ x: -300 - 205, y: -618 - 564 })
    expect(swingBounds(swing)).toMatchObject({ x: expect.closeTo(-505, 0), width: expect.closeTo(805, 0) })
  })

  it('turn each leaf of a double door on its outer side', () => {
    const [a, b] = swingsOf(door('d', { double: true }))
    expect(a.pivot.x).toBe(-300)
    expect(b.pivot.x).toBe(300)
    expect(a.square.y).toBe(-618 - (600 - DOOR_LEAF_GAP) / 2)
  })

  it('open doors on a side wall across the room', () => {
    // Facing the left wall, the room's open side is on your left and the back
    // wall on your right, so a door hinged on its left turns out from the end
    // nearer the open side.
    const [swing] = swingsOf(door('d', { wall: 'left' }))
    expect(swing.pivot).toEqual({ x: -1200 + 618, y: -(900 + 300) })
    expect(swing.square).toEqual({ x: -1200 + 618 + 600, y: -(900 + 300) })
    const [right] = swingsOf(door('d', { wall: 'right' }))
    expect(right.square.x).toBe(1200 - 618 - 600)
  })
})

describe('what an opening door hits', () => {
  it('checks nothing with only one wall: doors open into free space', () => {
    const oneWall = { ...room, left: false, right: false }
    const corner = door('d', { x: -1200, hinge: 'left' })
    expect(swingConflicts([side(), corner], thickness, oneWall).size).toBe(0)
  })

  it('finds a door that swings back into the side wall past square', () => {
    // Hinged 100 mm from the left wall: square is clear, 110° isn't.
    const nearWall = door('d', { x: -1100 })
    expect(swingConflicts([side(undefined, -1100), nearWall], thickness, room).get('d')).toEqual([
      { kind: 'wall', wall: 'left' },
    ])
    const clear = door('d', { x: -900 })
    expect(swingConflicts([side(undefined, -900), clear], thickness, room).size).toBe(0)
  })

  it('finds doors in a corner that open into each other', () => {
    // A back-wall door in the left corner, hinged on the right so it's clear
    // of the wall, and a left-wall door at the back end of its wall.
    const back = door('back', { x: -1200 + 618, hinge: 'right' })
    const left = door('left', { x: 900 - 618 - 600, wall: 'left', hinge: 'right' })
    const units = [side(undefined, -1200 + 600), side('left', 900 - 618)]
    const conflicts = swingConflicts([...units, back, left], thickness, room)
    expect(conflicts.get('back')).toContainEqual({ kind: 'part', id: 'left' })
    expect(conflicts.get('left')).toContainEqual({ kind: 'part', id: 'back' })
  })

  it('lets a door swing over a lower part on another wall', () => {
    const high = door('d', { x: -1200 + 618, hinge: 'right', y: 1000, height: 1000 })
    // 700 deep, so it reaches into the door's path; only the height decides.
    const low = piece('drawer', 'drawer', { x: 900 - 618 - 500, width: 500, height: 800, depth: 700, wall: 'left' })
    const conflicts = swingConflicts([side(undefined, -1200 + 600), high, low], thickness, room)
    expect(conflicts.get('d') ?? []).not.toContainEqual({ kind: 'part', id: 'drawer' })
    const tall = { ...low, height: 1500 }
    expect(swingConflicts([side(undefined, -1200 + 600), high, tall], thickness, room).get('d')).toContainEqual({
      kind: 'part',
      id: 'drawer',
    })
  })

  it("doesn't check doors on the same wall against each other", () => {
    // Hinged on the same panel from both sides: they meet past square, as intended.
    const a = door('a', { x: -600, hinge: 'right' })
    const b = door('b', { x: 0, hinge: 'left' })
    expect(swingConflicts([side(undefined, -618), a, b], thickness, room).size).toBe(0)
  })
})
