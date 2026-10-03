import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS, DOOR_LEAF_GAP, PLINTH_RECESS } from './defaults'
import {
  clearanceBelow,
  contentBounds,
  depthStart,
  doorLeaves,
  findClashes,
  fitBetweenSides,
  isHexColor,
  neighbourGaps,
  normalizePiece,
  pieceSolids,
  wallDepthStart,
} from './geometry'
import { DEFAULT_ROOM } from './room'

const thickness = DEFAULT_THICKNESS
const raw = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}): Piece => ({
  id,
  kind,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  depth: 100,
  ...rect,
})
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}) =>
  normalizePiece(raw(id, kind, rect), thickness)

describe('normalizePiece', () => {
  it('rounds to whole mm, keeps sizes at least 1 and parts above the floor', () => {
    expect(normalizePiece(raw('a', 'drawer', { x: 10.6, y: -40, width: 0, height: -5 }), thickness)).toMatchObject({
      x: 11,
      y: 0,
      width: 1,
      height: 1,
    })
  })

  it('treats a missing number as 0 rather than breaking the design', () => {
    expect(normalizePiece(raw('a', 'drawer', { x: Number.NaN }), thickness).x).toBe(0)
  })

  it('resets a board’s thickness from its board, whatever was asked', () => {
    expect(piece('a', 'vertical', { width: 50 }).width).toBe(18)
    expect(piece('a', 'shelf', { height: 50 }).height).toBe(18)
    expect(piece('a', 'back', { depth: 50 }).depth).toBe(3)
    expect(piece('a', 'plinth', { depth: 50 }).depth).toBe(18)
    expect(normalizePiece(raw('a', 'door', { depth: 50 }), { ...thickness, front: 22 }).depth).toBe(22)
  })

  it('makes a rod round: its depth is its diameter', () => {
    expect(piece('a', 'rod', { height: 32, depth: 400 }).depth).toBe(32)
  })

  it('keeps each option only on the kind it belongs to, and only when not the default', () => {
    expect(piece('a', 'shelf', { fixed: true }).fixed).toBe(true)
    expect(piece('a', 'shelf', { fixed: false })).not.toHaveProperty('fixed')
    expect(piece('a', 'divider', { fixed: true })).not.toHaveProperty('fixed')
    expect(piece('a', 'rail', { railAt: 'back' }).railAt).toBe('back')
    expect(piece('a', 'rail', { railAt: 'front' })).not.toHaveProperty('railAt')
    expect(piece('a', 'shelf', { railAt: 'back' })).not.toHaveProperty('railAt')
  })

  it('stores the back wall as no wall, and drops a colour that isn’t #rrggbb', () => {
    expect(piece('a', 'shelf', { wall: 'left' }).wall).toBe('left')
    expect(piece('a', 'shelf', { wall: 'back' as never })).not.toHaveProperty('wall')
    expect(piece('a', 'shelf', { color: '#AbCdEf' }).color).toBe('#AbCdEf')
    expect(piece('a', 'shelf', { color: 'red' })).not.toHaveProperty('color')
    expect(piece('a', 'shelf', { boxId: '' })).not.toHaveProperty('boxId')
  })
})

describe('contentBounds', () => {
  it('spans everything, or is null for nothing', () => {
    expect(contentBounds([])).toBeNull()
    expect(
      contentBounds([
        { x: -100, y: 0, width: 50, height: 10 },
        { x: 20, y: 30, width: 100, height: 70 },
      ]),
    ).toEqual({ minX: -100, maxX: 120, minY: 0, maxY: 100 })
  })
})

describe('neighbourGaps', () => {
  // A 600 wide unit, 1000 high inside, with a shelf at 400.
  const left = piece('l', 'vertical', { x: -300, height: 1000 })
  const right = piece('r', 'vertical', { x: 282, height: 1000 })
  const shelf = piece('s', 'shelf', { x: -282, y: 400, width: 564 })
  const back = piece('back', 'back', { x: -300, width: 600, height: 1000 })

  it('measures to the floor below and to the nearest part on each side', () => {
    const gaps = neighbourGaps(shelf, [left, right, shelf, back])
    // Touching the sides: no line. Floor below: 400. Nothing above: no line.
    expect(gaps).toEqual([{ axis: 'y', from: 0, to: 400, at: 0 }])
  })

  it('measures to parts that don’t touch, and ignores the back panel', () => {
    const narrow = piece('n', 'shelf', { x: -200, y: 400, width: 300 })
    const gaps = neighbourGaps(narrow, [left, right, narrow, back])
    expect(gaps).toContainEqual({ axis: 'x', from: -282, to: -200, at: 409 })
    expect(gaps).toContainEqual({ axis: 'x', from: 100, to: 282, at: 409 })
  })

  it('splits an edge where different parts face it', () => {
    const divider = piece('d', 'divider', { x: -9, y: 418, height: 500 })
    const top = piece('t', 'shelf', { x: -282, y: 918, width: 564 })
    const gaps = neighbourGaps(shelf, [left, right, shelf, divider, top]).filter((g) => g.axis === 'y' && g.from === 418)
    // Either side of the divider, the shelf faces the top shelf 500 above.
    expect(gaps.map((g) => g.to)).toEqual([918, 918])
    expect(gaps.map((g) => g.at)).toEqual([-145.5, 145.5])
  })

  it('measures to obstacles such as the room’s walls', () => {
    const gaps = neighbourGaps(left, [left], [{ x: -1300, y: 0, width: 100, height: 3000 }])
    expect(gaps).toContainEqual({ axis: 'x', from: -1200, to: -300, at: 500 })
  })

  it('ignores parts it overlaps', () => {
    const inside = piece('i', 'drawer', { x: -100, y: 350, width: 200, height: 200 })
    const gaps = neighbourGaps(shelf, [shelf, inside])
    expect(gaps.every((g) => g.to !== 350 && g.from !== 550)).toBe(true)
  })
})

describe('depthStart', () => {
  const back = piece('back', 'back', { width: 600, height: 1000 })
  const side = piece('side', 'vertical', { height: 1000, depth: 597 })

  it('stands parts in front of the back panel, and the back panel against the wall', () => {
    const z = depthStart([back, side], thickness)
    expect(z(back)).toBe(0)
    expect(z(side)).toBe(3)
  })

  it('stands parts against the wall when there’s no back panel', () => {
    expect(depthStart([side], thickness)(side)).toBe(0)
  })

  it('sets the plinth back from the front and runs front rails along it', () => {
    const plinth = piece('p', 'plinth', { height: 80 })
    const front = piece('f', 'rail', {})
    const backRail = piece('br', 'rail', { railAt: 'back' })
    const z = depthStart([back, side, plinth, front, backRail], thickness)
    expect(z(plinth)).toBe(600 - PLINTH_RECESS - 18)
    expect(z(front)).toBe(600 - 100)
    expect(z(backRail)).toBe(3)
  })

  it('places overlay doors in front of the unit and inset doors flush inside it', () => {
    const overlay = piece('o', 'door', {})
    const inset = piece('i', 'door', { inset: true })
    const z = depthStart([back, side, overlay, inset], thickness)
    expect(z(overlay)).toBe(600)
    expect(z(inset)).toBe(600 - 18)
  })

  it('works out each wall’s unit on its own', () => {
    const deep = piece('deep', 'vertical', { depth: 800, wall: 'left' })
    const plinth = piece('p', 'plinth', { height: 80 })
    const z = wallDepthStart([side, plinth, deep], thickness)
    // The back wall's plinth follows the back wall's 597 deep unit, not the 800 one.
    expect(z(plinth)).toBe(597 - PLINTH_RECESS - 18)
  })
})

describe('findClashes', () => {
  it('finds parts that take up the same space, but not ones that touch', () => {
    const a = piece('a', 'shelf', { width: 500, depth: 400 })
    const touching = piece('b', 'shelf', { x: 500, width: 500, depth: 400 })
    const overlapping = piece('c', 'shelf', { x: 400, width: 500, depth: 400 })
    expect(findClashes([a, touching], thickness).size).toBe(0)
    expect(findClashes([a, overlapping], thickness)).toEqual(new Set(['a', 'c']))
  })

  it('doesn’t count the back panel behind the parts in front of it', () => {
    const back = piece('back', 'back', { width: 600, height: 1000 })
    const shelf = piece('s', 'shelf', { width: 600, depth: 400 })
    expect(findClashes([back, shelf], thickness).size).toBe(0)
  })

  it('ignores overlaps smaller than half a millimetre', () => {
    const a = { ...piece('a', 'shelf', { width: 500, depth: 400 }) }
    const b = { ...piece('b', 'shelf', { width: 500, depth: 400 }), x: 499.6 }
    expect(findClashes([a, b], thickness, DEFAULT_ROOM).size).toBe(0)
  })
})

describe('clearanceBelow', () => {
  it('measures down to the highest part under the rod, or the floor', () => {
    const rod = piece('rod', 'rod', { x: -250, y: 1800, width: 500, height: 25 })
    const shelf = piece('s', 'shelf', { x: 0, y: 600, width: 400 })
    const back = piece('back', 'back', { x: -300, width: 600, height: 2000 })
    expect(clearanceBelow(rod, [rod, shelf, back])).toBe(1800 - 618)
    expect(clearanceBelow(rod, [rod])).toBe(1800)
  })

  it('ignores parts beside the rod, and doors in front of it', () => {
    const rod = piece('rod', 'rod', { x: -250, y: 1800, width: 500, height: 25 })
    const beside = piece('s', 'shelf', { x: 300, y: 1000, width: 200 })
    const door = piece('d', 'door', { x: -300, width: 600, height: 1000 })
    expect(clearanceBelow(rod, [rod, beside, door])).toBe(1800)
  })
})

describe('doorLeaves', () => {
  it('is the door itself when single, or two halves with a gap when double', () => {
    const door = { x: -300, width: 600 }
    expect(doorLeaves(door, false)).toEqual([door])
    const half = (600 - DOOR_LEAF_GAP) / 2
    expect(doorLeaves(door, true)).toEqual([
      { x: -300, width: half },
      { x: 300 - half, width: half },
    ])
  })
})

describe('pieceSolids', () => {
  it('is one box for most parts, two for a double door, and a drawer’s boards', () => {
    expect(pieceSolids(piece('s', 'shelf'), 0, thickness, DEFAULT_ROOM)).toHaveLength(1)
    expect(pieceSolids(piece('d', 'door', { double: true }), 0, thickness, DEFAULT_ROOM)).toHaveLength(2)
    const drawer = piece('dr', 'drawer', { width: 564, height: 200, depth: 550 })
    expect(pieceSolids(drawer, 0, thickness, DEFAULT_ROOM)).toHaveLength(5)
  })

  it('splits a double door on a side wall front to back', () => {
    const room = { ...DEFAULT_ROOM, left: true }
    const [a, b] = pieceSolids(piece('d', 'door', { double: true, width: 600, wall: 'left' }), 0, thickness, room)
    expect(a.min[0]).toBe(b.min[0])
    expect(a.max[2] <= b.min[2] || b.max[2] <= a.min[2]).toBe(true)
  })
})

describe('isHexColor', () => {
  it('accepts #rrggbb only', () => {
    expect(['#000000', '#a1B2c3'].every(isHexColor)).toBe(true)
    expect(['#fff', 'red', '000000', 42, null].some(isHexColor)).toBe(false)
  })
})

describe('drawer runner options', () => {
  it('keeps soft-close and push-to-open on drawers only, storing ordinary runners as nothing', () => {
    expect(piece('w', 'drawer', { close: 'soft' }).close).toBe('soft')
    expect(piece('w', 'drawer', { close: 'push' }).close).toBe('push')
    expect(piece('w', 'drawer', { close: 'magic' as 'soft' })).not.toHaveProperty('close')
    expect(piece('s', 'shelf', { close: 'soft' })).not.toHaveProperty('close')
  })
})

describe('door hinge options', () => {
  it('keeps wide angles and soft-close on doors only, storing standard hinges as nothing', () => {
    expect(piece('d', 'door', { openAngle: 155, softClose: true })).toMatchObject({ openAngle: 155, softClose: true })
    expect(piece('d', 'door', { openAngle: 110 })).not.toHaveProperty('openAngle')
    expect(piece('d', 'door', { openAngle: 120 })).not.toHaveProperty('openAngle')
    expect(piece('d', 'door', { softClose: false })).not.toHaveProperty('softClose')
    expect(piece('s', 'shelf', { openAngle: 155, softClose: true })).not.toHaveProperty('openAngle')
    expect(piece('s', 'shelf', { softClose: true })).not.toHaveProperty('softClose')
  })
})

describe('fitBetweenSides', () => {
  // The sides in the reported project: an odd gap of 1211 mm, from -1182 to 29.
  const left = piece('l', 'vertical', { x: -1200, height: 2000 })
  const right = piece('r', 'vertical', { x: 29, height: 2000 })

  it('fills the gap between the nearest panels, face to face, to the mm', () => {
    const plinth = piece('p', 'plinth', { x: -1180, y: 20, width: 1200, height: 80 })
    expect(fitBetweenSides(plinth, [left, right, plinth])).toEqual({ x: -1182, width: 1211 })
  })

  it('stops at a divider nearer than the side', () => {
    const divider = piece('d', 'divider', { x: -400, height: 2000 })
    const shelf = piece('s', 'shelf', { x: -300, y: 990, width: 100 })
    expect(fitBetweenSides(shelf, [left, right, divider, shelf])).toEqual({ x: -382, width: 411 })
  })

  it('runs an overlay drawer across the panels’ edges', () => {
    const drawer = piece('w', 'drawer', { x: -1100, y: 100, width: 800, height: 200, overlay: true })
    expect(fitBetweenSides(drawer, [left, right, drawer])).toEqual({ x: -1200, width: 1247 })
  })

  it('needs a panel on both sides, at the part’s height, on its wall', () => {
    const shelf = piece('s', 'shelf', { x: -600, y: 990, width: 100 })
    expect(fitBetweenSides(shelf, [left, shelf])).toBeNull()
    const low = piece('r2', 'vertical', { x: 29, height: 500 })
    expect(fitBetweenSides(shelf, [left, low, shelf])).toBeNull()
    expect(fitBetweenSides(shelf, [left, { ...right, wall: 'left' }, shelf])).toBeNull()
  })
})
