import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { cutList, hardwareList } from './cutList'
import { DEFAULT_THICKNESS, DRAWER_BOX_CLEARANCE, FRONT_GAP, RUNNER_GAP } from './defaults'
import { drawerParts, runnerLength } from './drawer'
import { depthStart, findClashes, normalizePiece } from './geometry'

const thickness = DEFAULT_THICKNESS
const drawer = (rect: Partial<Piece> = {}): Piece =>
  normalizePiece(
    { id: 'd', kind: 'drawer', x: -282, y: 100, width: 564, height: 200, depth: 550, ...rect },
    thickness,
  )

describe('drawers', () => {
  it('take the longest runner that fits behind the front', () => {
    expect(runnerLength(drawer(), thickness)).toBe(500)
    expect(runnerLength(drawer({ depth: 518 }), thickness)).toBe(500)
    expect(runnerLength(drawer({ depth: 517 }), thickness)).toBe(450)
    expect(runnerLength(drawer({ depth: 260 }), thickness)).toBeNull()
  })

  it('are built from a front and a box that leaves room for the runners', () => {
    const parts = drawerParts(drawer(), thickness)
    const byRole = (role: string) => parts.filter((part) => part.role === role)
    const [front] = byRole('front')
    const [bottom] = byRole('bottom')
    const sides = byRole('side')
    const [back] = byRole('back')

    // Inset: the front fills the opening, less a small gap all round.
    expect(front).toMatchObject({
      x: -282 + FRONT_GAP,
      y: 100 + FRONT_GAP,
      width: 564 - 2 * FRONT_GAP,
      height: 200 - 2 * FRONT_GAP,
      depth: 18,
      z: 550 - 18,
    })
    const boxWidth = 564 - 2 * RUNNER_GAP
    expect(bottom).toMatchObject({ width: boxWidth, depth: 500, height: thickness.back })
    // The box ends at the back of the front.
    expect(bottom.z + bottom.depth).toBe(front.z)
    expect(sides).toHaveLength(2)
    expect(sides[0].x).toBe(-282 + RUNNER_GAP)
    expect(sides[1].x + sides[1].width).toBe(282 - RUNNER_GAP)
    expect(sides[0].height + thickness.back).toBe(200 - DRAWER_BOX_CLEARANCE)
    expect(back.width).toBe(boxWidth - 2 * 18)
  })

  it('go into the cut list as their boards, and their runners into the hardware', () => {
    const groups = cutList([drawer(), drawer({ id: 'e', extension: 'full' })], thickness)
    // Same boards, so one group: the runner type doesn't change them.
    expect(groups).toHaveLength(1)
    expect(groups[0].drawers).toEqual({ count: 2, width: 564, height: 200 })
    expect(Object.fromEntries(groups[0].rows.map((row) => [row.label, row.quantity]))).toEqual({
      Front: 2,
      Side: 4,
      Back: 2,
      Bottom: 2,
    })
    const runners = (pieces: Piece[]) =>
      hardwareList(pieces, thickness).filter((row) => row.item === 'runners')
    expect(runners([drawer(), drawer({ id: 'e', extension: 'full' }), drawer({ id: 'f' })])).toEqual([
      { item: 'runners', extension: 'full', close: 'ordinary', length: 500, quantity: 1 },
      { item: 'runners', extension: 'standard', close: 'ordinary', length: 500, quantity: 2 },
    ])
  })

  it('count soft-close and push-to-open runners apart from ordinary ones', () => {
    const list = hardwareList(
      [drawer({ id: 'a', close: 'push' }), drawer({ id: 'b' }), drawer({ id: 'c', close: 'soft' }), drawer({ id: 'd', close: 'soft' })],
      thickness,
    ).filter((row) => row.item === 'runners')
    expect(list.map((row) => [row.close, row.quantity])).toEqual([
      ['ordinary', 1],
      ['soft', 2],
      ['push', 1],
    ])
  })

  it('are listed after the unit, one group per design, wherever they are', () => {
    const shelf = normalizePiece(
      { id: 's', kind: 'shelf', x: 0, y: 0, width: 500, height: 18, depth: 300 },
      thickness,
    )
    const groups = cutList(
      [drawer(), shelf, drawer({ id: 'e', y: 400, height: 150 }), drawer({ id: 'f', x: 500 })],
      thickness,
    )
    expect(groups.map((group) => [group.section, group.drawers])).toEqual([
      ['shelves', null],
      ['drawers', { count: 2, width: 564, height: 200 }],
      ['drawers', { count: 1, width: 564, height: 150 }],
    ])
    expect(groups[0].rows.map((row) => row.label)).toEqual(['Adjustable shelf'])
  })

  it('leave a drawer too shallow for runners out of the hardware', () => {
    expect(hardwareList([drawer({ depth: 200 })], thickness).map((row) => row.item)).toEqual(['handles'])
  })

  it('sit with their front flush with the front of the unit', () => {
    const side = normalizePiece(
      { id: 's', kind: 'vertical', x: -300, y: 0, width: 18, height: 1000, depth: 600 },
      thickness,
    )
    const zStart = depthStart([side, drawer()], thickness)
    expect(zStart(drawer()) + drawer().depth).toBe(600)
  })

  it('leave the usual gap between two fronts stacked on each other', () => {
    const [lower] = drawerParts(drawer(), thickness)
    const [upper] = drawerParts(drawer({ y: 300 }), thickness)
    expect(upper.y - (lower.y + lower.height)).toBe(2 * FRONT_GAP)
  })

  describe('with an overlay front', () => {
    // A 600 wide unit: 18 mm sides, a 564 mm opening from y = 18 up.
    const side = (id: string, x: number) =>
      normalizePiece({ id, kind: 'vertical', x, y: 0, width: 18, height: 1000, depth: 600 }, thickness)
    const bottom = normalizePiece(
      { id: 'b', kind: 'horizontal', x: -282, y: 0, width: 564, height: 18, depth: 600 },
      thickness,
    )
    const unit = [side('l', -300), side('r', 282), bottom]
    // Sized to its front: the opening plus a board all round.
    const overlay = drawer({ x: -300, y: 0, width: 600, height: 236, overlay: true })

    it('build the box for the opening behind the front', () => {
      const parts = drawerParts(overlay, thickness)
      const front = parts.find((part) => part.role === 'front')!
      const box = parts.find((part) => part.role === 'bottom')!
      expect(front).toMatchObject({ width: 600 - 2 * FRONT_GAP, height: 236 - 2 * FRONT_GAP })
      expect(box).toMatchObject({ x: -282 + RUNNER_GAP, y: 18, width: 564 - 2 * RUNNER_GAP })
    })

    it('stand in front of the unit, covering its edges without clashing', () => {
      const zStart = depthStart([...unit, overlay], thickness)
      const [front] = drawerParts(overlay, thickness)
      expect(zStart(overlay) + front.z).toBe(600)
      expect(findClashes([...unit, overlay], thickness).size).toBe(0)
    })

    it('clash as inset at the same size, the box running into the sides', () => {
      const inset = { ...overlay, overlay: undefined }
      expect(findClashes([...unit, inset], thickness).has('d')).toBe(true)
    })
  })

  it('cut the front and box from their own boards', () => {
    const own = { ...thickness, front: 22, drawer: 12 }
    const parts = drawerParts(drawer(), own)
    const byRole = (role: string) => parts.find((part) => part.role === role)!
    expect(byRole('front')).toMatchObject({ board: 'front', depth: 22, z: 550 - 22 })
    expect(byRole('side')).toMatchObject({ board: 'drawer', width: 12 })
    expect(byRole('back')).toMatchObject({ board: 'drawer', depth: 12 })
    expect(byRole('back').width).toBe(564 - 2 * RUNNER_GAP - 2 * 12)
    expect(byRole('bottom').board).toBe('back')
    // The runners fit behind the front, whatever it's made of.
    expect(runnerLength(drawer({ depth: 521 }), own)).toBe(450)
  })

  it('store only the full-extension and overlay choices', () => {
    expect(drawer({ extension: 'standard' })).not.toHaveProperty('extension')
    expect(drawer({ overlay: false })).not.toHaveProperty('overlay')
    expect(drawer({ overlay: true }).overlay).toBe(true)
    expect(drawer({ extension: 'full' }).extension).toBe('full')
    const shelf = normalizePiece(
      { id: 's', kind: 'shelf', x: 0, y: 0, width: 500, height: 18, depth: 300, extension: 'full' },
      thickness,
    )
    expect(shelf).not.toHaveProperty('extension')
  })
})
