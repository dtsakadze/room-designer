import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS, DOOR_LEAF_GAP } from '../lib/defaults'
import { drawOrder, doorSwings, piecesAt, swingBounds } from './views'

const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}): Piece => ({
  id,
  kind,
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
  depth: 18,
  ...rect,
})

describe('clicking through a stack', () => {
  const back = piece('back', 'back')
  const shelf = piece('shelf', 'shelf', { y: 400, height: 18 })
  const door = piece('door', 'door')
  const pieces = [door, back, shelf]

  it('draws the back panel underneath and doors on top in the front view', () => {
    expect(drawOrder(pieces, 'front').map((p) => p.id)).toEqual(['back', 'shelf', 'door'])
  })

  it('goes from the door to the parts inside, then the back panel', () => {
    expect(piecesAt(pieces, 500, 405, 'front').map((p) => p.id)).toEqual(['door', 'shelf', 'back'])
    expect(piecesAt(pieces, 500, 800, 'front').map((p) => p.id)).toEqual(['door', 'back'])
  })

  it('keeps doors underneath from behind, where they are furthest away', () => {
    expect(piecesAt(pieces, 500, 405, 'back').map((p) => p.id)).toEqual(['shelf', 'back', 'door'])
  })
})

describe('door swings in the top view', () => {
  const room = { left: true, right: true, width: 2400, depth: 1800 }
  // A 600 mm deep side, so doors stand in front of it at 600.
  const side = piece('side', 'vertical', { x: -300, width: 18, height: 2000, depth: 600 })
  const door = (rect: Partial<Piece>) =>
    piece('door', 'door', { x: -300, width: 600, height: 2000, ...rect })
  const swings = (d: Piece) =>
    doorSwings([{ ...side, wall: d.wall }, d], DEFAULT_THICKNESS, room)

  it('turns a single door on its hinge side, out into the room', () => {
    const [left] = swings(door({}))
    // The front face is 600 + 18 out from the back wall, which is y = 0.
    expect(left).toEqual({
      id: 'door',
      pivot: { x: -300, y: -618 },
      closed: { x: 300, y: -618 },
      open: { x: -300, y: -1218 },
    })
    const [right] = swings(door({ hinge: 'right' }))
    expect(right.pivot).toEqual({ x: 300, y: -618 })
    expect(right.open).toEqual({ x: 300, y: -1218 })
  })

  it('turns each leaf of a double door on its outer side', () => {
    const [a, b] = swings(door({ double: true }))
    const leaf = (600 - DOOR_LEAF_GAP) / 2
    expect(a.pivot.x).toBe(-300)
    expect(b.pivot.x).toBe(300)
    expect(a.open.y).toBe(-618 - leaf)
  })

  it('opens doors on a side wall across the room', () => {
    // Facing the left wall, the room's open side is on your left and the back
    // wall on your right, so a door hinged on its left turns out from the end
    // nearer the open side.
    const [swing] = swings(door({ wall: 'left' }))
    expect(swing.pivot).toEqual({ x: -1200 + 618, y: -(900 + 300) })
    expect(swing.open).toEqual({ x: -1200 + 618 + 600, y: -(900 + 300) })
    const [right] = swings(door({ wall: 'right' }))
    expect(right.open.x).toBe(1200 - 618 - 600)
  })

  it('frames the whole quarter circle', () => {
    const [swing] = swings(door({}))
    expect(swingBounds(swing)).toEqual({ x: -300, y: -1218, width: 600, height: 600 })
  })
})
