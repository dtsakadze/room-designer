import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { cutList, hardwareList } from './cutList'
import { DEFAULT_THICKNESS, DRAWER_BOX_CLEARANCE, RUNNER_GAP } from './defaults'
import { drawerParts, runnerLength } from './drawer'
import { depthStart, normalizePiece } from './geometry'

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

    expect(front).toMatchObject({ x: -282, width: 564, height: 200, depth: 18, z: 550 - 18 })
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
    expect(hardwareList([drawer(), drawer({ id: 'e', extension: 'full' }), drawer({ id: 'f' })], thickness)).toEqual([
      { extension: 'full', length: 500, pairs: 1 },
      { extension: 'standard', length: 500, pairs: 2 },
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
    expect(hardwareList([drawer({ depth: 200 })], thickness)).toEqual([])
  })

  it('sit with their front flush with the front of the unit', () => {
    const side = normalizePiece(
      { id: 's', kind: 'vertical', x: -300, y: 0, width: 18, height: 1000, depth: 600 },
      thickness,
    )
    const zStart = depthStart([side, drawer()], thickness)
    expect(zStart(drawer()) + drawer().depth).toBe(600)
  })

  it('store only the full-extension choice', () => {
    expect(drawer({ extension: 'standard' })).not.toHaveProperty('extension')
    expect(drawer({ extension: 'full' }).extension).toBe('full')
    const shelf = normalizePiece(
      { id: 's', kind: 'shelf', x: 0, y: 0, width: 500, height: 18, depth: 300, extension: 'full' },
      thickness,
    )
    expect(shelf).not.toHaveProperty('extension')
  })
})
