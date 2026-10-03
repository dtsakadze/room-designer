import { describe, expect, it } from 'vitest'
import type { Box, Piece } from '../types'
import { boxPanels, normalizeBox, rebuildBox, withBoxPanels } from './box'
import { DEFAULT_THICKNESS } from './defaults'

const thickness = DEFAULT_THICKNESS
const box = (patch: Partial<Box> = {}): Box => ({
  id: 'b',
  x: -600,
  y: 0,
  width: 1200,
  height: 2000,
  depth: 600,
  joint: 'between',
  ...patch,
})
const byRole = (panels: Piece[]) => Object.fromEntries(panels.map((p) => [p.id.split(':')[1], p]))

describe('box panels', () => {
  it('makes a back, two sides, a top and a bottom, tagged with the box', () => {
    const panels = boxPanels(box(), thickness)
    expect(panels.map((p) => p.id)).toEqual(['b:back', 'b:left', 'b:right', 'b:bottom', 'b:top'])
    expect(panels.every((p) => p.boxId === 'b')).toBe(true)
    expect(panels.map((p) => p.kind)).toEqual(['back', 'vertical', 'vertical', 'horizontal', 'horizontal'])
  })

  it('runs the sides full height with the top and bottom between them', () => {
    const { back, left, right, bottom, top } = byRole(boxPanels(box(), thickness))
    expect(back).toMatchObject({ x: -600, y: 0, width: 1200, height: 2000, depth: 3 })
    expect(left).toMatchObject({ x: -600, y: 0, width: 18, height: 2000, depth: 597 })
    expect(right).toMatchObject({ x: 582, width: 18, height: 2000 })
    expect(bottom).toMatchObject({ x: -582, y: 0, width: 1164, height: 18, depth: 597 })
    expect(top).toMatchObject({ x: -582, y: 1982, width: 1164, height: 18 })
  })

  it('runs the top and bottom full width with the sides between them', () => {
    const { left, bottom, top } = byRole(boxPanels(box({ joint: 'on' }), thickness))
    expect(bottom).toMatchObject({ x: -600, width: 1200 })
    expect(top).toMatchObject({ x: -600, y: 1982, width: 1200 })
    expect(left).toMatchObject({ y: 18, height: 2000 - 36 })
  })

  it('puts every panel on the box’s wall', () => {
    const panels = boxPanels(box({ wall: 'left' }), thickness)
    expect(panels.every((p) => p.wall === 'left')).toBe(true)
  })

  it('follows the project’s board thicknesses', () => {
    const { back, left, top } = byRole(boxPanels(box(), { ...thickness, body: 25, back: 8 }))
    expect(back.depth).toBe(8)
    expect(left).toMatchObject({ width: 25, depth: 592 })
    expect(top.height).toBe(25)
  })
})

describe('normalizeBox', () => {
  it('rounds to whole mm and keeps the box above the floor', () => {
    expect(normalizeBox(box({ x: -600.4, y: -50, width: 1200.6 }), thickness)).toMatchObject({
      x: -600,
      y: 0,
      width: 1201,
    })
  })

  it('keeps a box big enough to hold its own boards', () => {
    const tiny = normalizeBox(box({ width: 5, height: 5, depth: 1 }), thickness)
    expect(tiny).toMatchObject({ width: 37, height: 37, depth: 4 })
  })

  it('stores the back wall and an unknown joint as the defaults', () => {
    const odd = normalizeBox({ ...box(), wall: 'back' as never, joint: 'glued' as never }, thickness)
    expect(odd).not.toHaveProperty('wall')
    expect(odd.joint).toBe('between')
  })
})

describe('rebuildBox', () => {
  it('replaces the panels where they were, so the parts list doesn’t shuffle', () => {
    const shelf: Piece = { id: 's', kind: 'shelf', x: 0, y: 500, width: 500, height: 18, depth: 400 }
    const pieces = [shelf, ...boxPanels(box(), thickness)]
    const rebuilt = rebuildBox(pieces, box({ width: 1000 }), thickness)
    expect(rebuilt.map((p) => p.id)).toEqual(pieces.map((p) => p.id))
    expect(rebuilt[0]).toBe(shelf)
    expect(byRole(rebuilt.slice(1)).right.x).toBe(-600 + 1000 - 18)
  })

  it('keeps each panel’s own colour', () => {
    const pieces = boxPanels(box(), thickness).map((p) =>
      p.id === 'b:left' ? { ...p, color: '#123456' } : p,
    )
    const rebuilt = rebuildBox(pieces, box({ height: 1500 }), thickness)
    expect(byRole(rebuilt).left.color).toBe('#123456')
    expect(byRole(rebuilt).right).not.toHaveProperty('color')
  })

  it('adds panels that are missing', () => {
    const rebuilt = rebuildBox([], box(), thickness)
    expect(rebuilt).toHaveLength(5)
  })
})

describe('withBoxPanels', () => {
  it('rebuilds every box and drops panels of boxes that are gone', () => {
    const orphan = { ...boxPanels(box({ id: 'gone' }), thickness)[0] }
    const stale = { ...boxPanels(box(), thickness)[1], height: 5 }
    const result = withBoxPanels([orphan, stale], [box()], thickness)
    expect(result.some((p) => p.boxId === 'gone')).toBe(false)
    expect(result).toHaveLength(5)
    expect(result.find((p) => p.id === 'b:left')!.height).toBe(2000)
  })
})

describe('rebuilding a box', () => {
  it('keeps what was set on a panel itself: colour, banding and grain', () => {
    const before = box()
    const panels = boxPanels(before, thickness).map((panel) =>
      panel.id === 'b:top'
        ? { ...panel, color: '#123456', bands: ['front' as const, 'left' as const], grain: 'depth' as const }
        : panel,
    )
    const rebuilt = byRole(rebuildBox(panels, box({ width: 900 }), thickness))
    expect(rebuilt.top).toMatchObject({ width: 864, color: '#123456', bands: ['front', 'left'], grain: 'depth' })
    expect(rebuilt.left).not.toHaveProperty('bands')
  })
})
