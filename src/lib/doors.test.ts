import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import {
  DEFAULT_THICKNESS,
  DOOR_LEAF_GAP,
  PANE_THICKNESS,
  SLIDING_OVERLAP,
  SLIDING_TRACK_HEIGHT,
  pieceLabel,
} from './defaults'
import { cutList, describeHardware, hardwareList } from './cutList'
import { PANE_FILLS, faceColor } from '../canvas/colors'
import { bandsOf } from './edges'
import { handleCount } from './fixings'
import { depthStart, findClashes, neighbourGaps, normalizePiece, slidingPanels } from './geometry'
import { doorHinges } from './hinges'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 100, height: 100, depth: 0, ...rect }, thickness)

// A 600 wide, 1000 high unit, 500 deep including its back panel.
const unit = [
  piece('back', 'back', { x: -300, width: 600, height: 1000 }),
  piece('left', 'vertical', { x: -300, height: 1000, depth: 497 }),
  piece('right', 'vertical', { x: 282, height: 1000, depth: 497 }),
  piece('bottom', 'horizontal', { x: -282, width: 564, depth: 497 }),
  piece('top', 'horizontal', { x: -282, y: 982, width: 564, depth: 497 }),
]

describe('doors', () => {
  it('take the body thickness, and keep only their own options', () => {
    const door = piece('d', 'door', { depth: 40, double: true, hinge: 'right', fixed: true })
    expect(door.depth).toBe(thickness.body)
    expect(door).not.toHaveProperty('hinge')
    expect(door).not.toHaveProperty('fixed')
  })

  it('stand in front of the unit (overlay) or flush inside it (inset)', () => {
    const overlay = piece('o', 'door', { x: -300, width: 600, height: 1000 })
    const inset = piece('i', 'door', { x: -280, y: 20, width: 560, height: 960, inset: true })
    const zStart = depthStart([...unit, overlay, inset], thickness)
    expect(zStart(overlay)).toBe(500)
    expect(zStart(inset)).toBe(500 - thickness.body)
  })

  it('clash with the carcass when inset but sized to its outside', () => {
    const inset = piece('i', 'door', { x: -300, width: 600, height: 1000, inset: true })
    expect(findClashes([...unit, inset], thickness).has('i')).toBe(true)
    const overlay = { ...inset, inset: undefined }
    expect(findClashes([...unit, overlay], thickness).size).toBe(0)
  })

  it("aren't in the way of the gap lines of the parts behind them", () => {
    const shelf = piece('shelf', 'shelf', { x: -282, y: 400, width: 564, depth: 400 })
    const door = piece('d', 'door', { x: -300, y: 600, width: 600, height: 400 })
    const up = neighbourGaps(shelf, [...unit, shelf, door]).find(
      (gap) => gap.axis === 'y' && gap.from === shelf.y + shelf.height,
    )
    expect(up?.to).toBe(982)
  })

  it('are cut as two leaves when double', () => {
    const double = piece('d', 'door', { width: 603, height: 2000, double: true })
    expect(cutList([double], thickness)[0].rows).toEqual([
      {
        kind: 'door',
        label: 'Double door leaf',
        quantity: 2,
        length: 2000,
        width: (603 - DOOR_LEAF_GAP) / 2,
        thickness: thickness.front,
        board: 'front',
        grain: false,
        // Each leaf is banded all round.
        bands: { length: 2, width: 2 },
      },
    ])
  })
})

describe('sliding doors', () => {
  const sliding = (rect: Partial<Piece> = {}) =>
    piece('s', 'door', { x: -600, width: 1200, height: 2000, sliding: 2, ...rect })

  it('keep only the options that apply, and a valid panel count and overlap', () => {
    const door = sliding({ double: true, inset: true, softClose: true, hinge: 'right', openAngle: 170 })
    expect(door.sliding).toBe(2)
    for (const key of ['double', 'inset', 'softClose', 'hinge', 'openAngle'] as const) {
      expect(door).not.toHaveProperty(key)
    }
    expect(sliding({ sliding: 7 })).not.toHaveProperty('sliding')
    expect(sliding({ overlap: SLIDING_OVERLAP })).not.toHaveProperty('overlap')
    expect(sliding({ overlap: 80 }).overlap).toBe(80)
    expect(sliding({ overlap: 5000 }).overlap).toBe(200)
    expect(piece('d', 'shelf', { sliding: 2, overlap: 80 })).not.toHaveProperty('sliding')
  })

  it('split the set into overlapping panels in alternating lanes, between the tracks', () => {
    const panels = slidingPanels({ ...sliding(), sliding: 2 })
    // Two panels covering 1200 with 50 shared: (1200 + 50) / 2 each.
    expect(panels.map((p) => [p.x, p.width, p.lane])).toEqual([
      [-600, 625, 0],
      [-25, 625, 1],
    ])
    expect(panels[0].y).toBe(SLIDING_TRACK_HEIGHT)
    expect(panels[0].height).toBe(2000 - 2 * SLIDING_TRACK_HEIGHT)
    const three = slidingPanels({ ...sliding({ sliding: 3 }), sliding: 3 })
    expect(three.map((p) => p.lane)).toEqual([0, 1, 0])
    expect(three.at(-1)!.x + three.at(-1)!.width).toBe(600)
    // (1200 + 2 × 50) / 3 is 433.3: cut as 433, the end ones still flush.
    expect(three.map((p) => [p.x, p.width])).toEqual([
      [-600, 433],
      [-216, 433],
      [167, 433],
    ])
  })

  it('stay within a set narrower than their overlap', () => {
    const narrow = slidingPanels({ ...sliding({ width: 150, sliding: 4, overlap: 200 }), sliding: 4 })
    for (const [i, panel] of narrow.entries()) {
      expect(panel.x).toBeGreaterThanOrEqual(-600)
      expect(panel.x + panel.width).toBeLessThanOrEqual(-450)
      if (i > 0) expect(panel.x).toBeGreaterThan(narrow[i - 1].x)
    }
    expect(narrow.at(-1)!.x + narrow.at(-1)!.width).toBe(-450)
  })

  it('are cut as one row of panels, and need a top and a bottom track', () => {
    const door = sliding({ sliding: 3 })
    const [row] = cutList([door], thickness)[0].rows
    expect(row).toMatchObject({ label: 'Sliding door panel', quantity: 3, length: 1940 })
    const hardware = hardwareList([door], thickness)
    expect(hardware.filter((r) => r.item === 'track')).toEqual([
      { item: 'track', position: 'bottom', length: 1200, quantity: 1 },
      { item: 'track', position: 'top', length: 1200, quantity: 1 },
    ])
    expect(describeHardware(hardware.find((r) => r.item === 'track')!, (mm) => `${mm}`).name).toBe(
      'Sliding door track, bottom, 1200',
    )
  })

  it('have no hinges, and a handle per panel', () => {
    expect(doorHinges([sliding()], thickness)).toEqual([])
    expect(hardwareList([sliding()], thickness).some((r) => r.item === 'hinges')).toBe(false)
    expect(handleCount([sliding({ sliding: 3 })])).toBe(3)
    expect(pieceLabel(sliding())).toBe('Sliding doors')
  })
})

describe('glass and mirror doors', () => {
  const pane = (rect: Partial<Piece> = {}) =>
    piece('g', 'door', { x: -300, width: 600, height: 2000, pane: 'glass', ...rect })

  it('are 4 mm thick whatever the front board is, with no board finish', () => {
    const door = pane({ depth: 30, color: '#ff0000', bands: ['top'], grain: 'width' })
    expect(door.depth).toBe(PANE_THICKNESS)
    for (const key of ['color', 'bands', 'grain'] as const) expect(door).not.toHaveProperty(key)
    expect(piece('s', 'shelf', { pane: 'glass' })).not.toHaveProperty('pane')
    expect(pane({ pane: 'wood' as never })).not.toHaveProperty('pane')
  })

  it('are left out of the cut list and listed as panes, one for each leaf or panel', () => {
    const doors = [pane(), pane({ width: 603, double: true, pane: 'mirror' }), pane({ width: 1200, sliding: 2, pane: 'mirror' })]
    expect(cutList(doors, thickness)).toEqual([])
    const panes = hardwareList(doors, thickness).filter((row) => row.item === 'panes')
    expect(panes).toEqual([
      { item: 'panes', pane: 'glass', width: 600, height: 2000, thickness: 4, quantity: 1 },
      { item: 'panes', pane: 'mirror', width: 300, height: 2000, thickness: 4, quantity: 2 },
      { item: 'panes', pane: 'mirror', width: 625, height: 1940, thickness: 4, quantity: 2 },
    ])
    expect(describeHardware(panes[0], (mm) => `${mm}`).name).toBe('Glass pane, 600 × 2000 × 4')
  })

  it('look like glass, not the board colour, and are not banded', () => {
    expect(faceColor(pane(), { boardColors: { front: '#000000' } })).toBe(PANE_FILLS.glass)
    expect(faceColor(pane({ pane: 'mirror' }), { boardColors: {} })).toBe(PANE_FILLS.mirror)
    expect(bandsOf(pane())).toEqual([])
  })
})
