import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'
import { grainDirection, roomAxisOf } from './grain'

const thickness = DEFAULT_THICKNESS
const piece = (kind: Piece['kind'], rect: Partial<Piece> = {}): Piece =>
  normalizePiece({ id: 'p', kind, x: 0, y: 0, width: 600, height: 400, depth: 500, ...rect }, thickness)

describe('grain direction on a face', () => {
  it('runs across a shelf and up a side, as grain usually does, only on boards with a grain', () => {
    expect(grainDirection(piece('shelf'), 'front', ['body'])).toBe('horizontal')
    expect(grainDirection(piece('vertical'), 'front', ['body'])).toBe('vertical')
    expect(grainDirection(piece('shelf'), 'front', [])).toBeNull()
    expect(grainDirection(piece('shelf'), 'front', ['front'])).toBeNull()
    expect(grainDirection(piece('rod'), 'front', ['body'])).toBeNull()
  })

  it('follows a part’s own grain, and shows nothing where it runs into the face', () => {
    // A shelf with its grain turned to run front to back: end grain from the front.
    const turned = piece('shelf', { grain: 'depth' })
    expect(grainDirection(turned, 'front', ['body'])).toBeNull()
    expect(grainDirection(turned, 'left', ['body'])).toBe('horizontal')
    expect(grainDirection(turned, 'top', ['body'])).toBe('vertical')
    // A side's grain runs up: end-on from above.
    expect(grainDirection(piece('vertical'), 'top', ['body'])).toBeNull()
    expect(grainDirection(piece('vertical'), 'left', ['body'])).toBe('vertical')
  })

  it('takes a drawer’s grain from its front, and none from glass or the 3D view', () => {
    expect(grainDirection(piece('drawer'), 'front', ['front'])).toBe('horizontal')
    expect(grainDirection(piece('door', { pane: 'glass' }), 'front', ['front'])).toBeNull()
    expect(grainDirection(piece('door'), '3d', ['front'])).toBeNull()
  })
})

describe('room axis of a dimension', () => {
  it('is x, y, z for width, height, depth on the back wall, and turned on a side wall', () => {
    expect(['width', 'height', 'depth'].map((d) => roomAxisOf(d as 'width', 'back'))).toEqual([0, 1, 2])
    expect(['width', 'height', 'depth'].map((d) => roomAxisOf(d as 'width', 'left'))).toEqual([2, 1, 0])
    expect(roomAxisOf('width', 'right')).toBe(2)
  })
})
