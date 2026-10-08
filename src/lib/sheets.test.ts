import { describe, expect, it } from 'vitest'
import type { BoardKey } from '../types'
import type { CutListRow } from './cutList'
import { DEFAULT_SHEETS, cleanSheet, layoutSheets } from './sheets'

const row = (length: number, width: number, quantity = 1, patch: Partial<CutListRow> = {}): CutListRow => ({
  kind: 'shelf',
  label: 'Shelf',
  quantity,
  length,
  width,
  thickness: 18,
  board: 'body',
  grain: false,
  bands: { length: 0, width: 0 },
  ...patch,
})
const sheet = { length: 1000, width: 500, kerf: 0 }

describe('sheet layout', () => {
  it('leaves out boards bought cut to size, and a board with no parts has no sheets', () => {
    expect(layoutSheets([row(600, 300)], {})).toEqual([])
    const [layout] = layoutSheets([row(600, 300, 1, { board: 'front' })], { body: sheet })
    expect(layout.board).toBe('body')
    expect(layout.sheets).toEqual([])
    expect(layout.waste).toBe(0)
  })

  it('puts every part on a sheet, none overlapping or off the edge', () => {
    const [layout] = layoutSheets([row(600, 300, 5), row(400, 200, 4)], { body: sheet })
    const parts = layout.sheets.flatMap((s) => s.parts)
    expect(parts).toHaveLength(9)
    for (const { parts: onSheet } of layout.sheets) {
      for (const p of onSheet) {
        expect(p.x + p.length).toBeLessThanOrEqual(sheet.length)
        expect(p.y + p.width).toBeLessThanOrEqual(sheet.width)
      }
      for (const [i, a] of onSheet.entries()) {
        for (const b of onSheet.slice(i + 1)) {
          const apart = a.x + a.length <= b.x || b.x + b.length <= a.x || a.y + a.width <= b.y || b.y + b.width <= a.y
          expect(apart).toBe(true)
        }
      }
    }
  })

  it('leaves the saw cut between neighbours', () => {
    const [tight] = layoutSheets([row(500, 500, 2)], { body: { ...sheet, kerf: 0 } })
    expect(tight.sheets).toHaveLength(1)
    // Two 500 parts fill a 1000 sheet exactly with no saw cut, but need a second sheet with one.
    const [cut] = layoutSheets([row(500, 500, 2)], { body: { ...sheet, kerf: 3 } })
    expect(cut.sheets).toHaveLength(2)
  })

  it('turns parts to fit unless the board has grain', () => {
    const tall = row(480, 900)
    const [free] = layoutSheets([tall], { body: sheet })
    expect(free.sheets[0].parts[0]).toMatchObject({ length: 900, width: 480, turned: true })
    const [grained] = layoutSheets([{ ...tall, grain: true }], { body: sheet })
    expect(grained.oversize).toEqual([{ label: 'Shelf', length: 480, width: 900 }])
    expect(grained.sheets).toEqual([])
  })

  it('flags a part too big for the sheet any way round, and still lays out the rest', () => {
    const [layout] = layoutSheets([row(1200, 600), row(300, 200)], { body: sheet })
    expect(layout.oversize).toHaveLength(1)
    expect(layout.sheets[0].parts).toHaveLength(1)
  })

  it('measures waste as the share of the sheets not covered', () => {
    const [layout] = layoutSheets([row(500, 500)], { body: sheet })
    // One 500 × 500 part on a 1000 × 500 sheet.
    expect(layout.waste).toBeCloseTo(0.5)
  })

  it('lists each board bought as sheets, in the order of the boards', () => {
    const rows = [row(300, 200, 1, { board: 'front' }), row(300, 200, 1, { board: 'body' })]
    const boards = layoutSheets(rows, { front: sheet, body: sheet }).map((l) => l.board)
    expect(boards).toEqual<BoardKey[]>(['body', 'front'])
  })
})

describe('sheet setup', () => {
  it('keeps sizes whole and sensible, and starts from the usual sheet of each material', () => {
    expect(cleanSheet({ length: 2440.4, width: 5, kerf: 99 })).toEqual({ length: 2440, width: 100, kerf: 20 })
    expect(DEFAULT_SHEETS.chipboard).toEqual({ length: 2800, width: 2070, kerf: 3 })
    expect(DEFAULT_SHEETS.mdf.length).toBe(2440)
  })
})
