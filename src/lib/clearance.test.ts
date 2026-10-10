import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { HANDLE_CLEARANCE, HINGE_CLEARANCE, SLIDING_CLEARANCE, clearanceWarnings, setBack } from './clearance'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 100, height: 100, depth: 0, ...rect }, thickness)

// A 600 wide, 1000 high unit, 500 deep including its back panel.
const unit = [
  piece('back', 'back', { x: -300, width: 600, height: 1000 }),
  piece('left', 'vertical', { x: -300, height: 1000, depth: 497 }),
  piece('right', 'vertical', { x: 282, height: 1000, depth: 497 }),
]
const drawer = (rect: Partial<Piece> = {}) =>
  piece('drawer', 'drawer', { x: -282, y: 100, width: 564, height: 200, depth: 450, ...rect })
const door = (rect: Partial<Piece> = {}) =>
  piece('door', 'door', { x: -300, width: 600, height: 1000, ...rect })

describe('drawer behind a door', () => {
  it('has no gap to the door by default: it needs room for the hinges and the handle', () => {
    const warnings = clearanceWarnings([...unit, drawer(), door()], thickness)
    expect(warnings.get('drawer')).toMatchObject({ doorId: 'door', gap: 0, needed: HINGE_CLEARANCE + HANDLE_CLEARANCE })
    // The same warning is on the door.
    expect(warnings.get('door')).toBe(warnings.get('drawer'))
  })

  it('needs no handle room without a handle, and less behind sliding doors', () => {
    expect(clearanceWarnings([...unit, drawer({ noHandle: true }), door()], thickness).get('drawer')?.needed).toBe(HINGE_CLEARANCE)
    expect(clearanceWarnings([...unit, drawer({ handle: 'profile' }), door()], thickness).get('drawer')?.needed).toBe(HINGE_CLEARANCE)
    const sliding = door({ sliding: 2 })
    expect(clearanceWarnings([...unit, drawer({ noHandle: true }), sliding], thickness).get('drawer')?.needed).toBe(SLIDING_CLEARANCE)
  })

  it('is fine once set back far enough, and the fix puts it there', () => {
    const tight = [...unit, drawer(), door()]
    const warning = clearanceWarnings(tight, thickness).get('drawer')!
    const fix = setBack(tight[3], warning)
    // The door's back is at 500, the drawer's front must be 45 behind it.
    expect(fix.z + fix.depth).toBe(455)
    expect(fix.depth).toBe(450)
    const fixed = [...unit, drawer(fix), door()]
    expect(clearanceWarnings(fixed, thickness).size).toBe(0)
  })

  it('shortens the drawer when setting it back would go through the back panel', () => {
    const deep = [...unit, drawer({ depth: 500 }), door()]
    const warning = clearanceWarnings(deep, thickness).get('drawer')!
    expect(setBack(deep[3], warning)).toEqual({ z: 0, depth: 455 })
  })

  it('ignores a door that is beside it, on another wall, or with no drawer behind', () => {
    expect(clearanceWarnings([...unit, drawer(), door({ x: 400 })], thickness).size).toBe(0)
    expect(clearanceWarnings([...unit, drawer(), door({ wall: 'left' })], thickness).size).toBe(0)
    expect(clearanceWarnings([...unit, drawer()], thickness).size).toBe(0)
    // Above the drawer, not in front of it.
    expect(clearanceWarnings([...unit, drawer(), door({ y: 400, height: 400 })], thickness).size).toBe(0)
  })

  it('warns when the drawer pokes through an inset door, with a negative gap', () => {
    const warning = clearanceWarnings([...unit, drawer(), door({ inset: true })], thickness).get('drawer')!
    expect(warning.gap).toBe(-thickness.front)
  })
})
