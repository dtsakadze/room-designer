import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { cutList, hardwareList } from './cutList'
import { cutListReport, groupName } from './cutListReport'
import { normalizePiece } from './geometry'
import { newDesign } from './project'

const design = newDesign()
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 600, height: 18, depth: 560, ...rect }, design.thickness)

describe('cutListReport', () => {
  const room = { ...design.room, left: true }
  const pieces = [
    piece('s', 'shelf'),
    piece('d', 'drawer', { height: 200 }),
    piece('l', 'shelf', { wall: 'left' }),
  ]

  it('is one list for the whole design, with its totals', () => {
    const report = cutListReport({ ...design, pieces, room }, false)
    expect(report.byWall).toBe(false)
    expect(report.runs).toEqual([report.whole])
    expect(report.whole.groups).toEqual(cutList(pieces, design.thickness, []))
    expect(report.whole.hardware).toEqual(hardwareList(pieces, design.thickness))
    const boards = report.whole.groups.flatMap((group) => group.rows).reduce((sum, row) => sum + row.quantity, 0)
    expect(report.totals).toMatchObject({ boards, hardware: report.whole.hardware.length, sheets: 0 })
  })

  it('has a list per wall in a room with side walls, but only when asked and there are side walls', () => {
    const report = cutListReport({ ...design, pieces, room }, true)
    expect(report.byWall).toBe(true)
    expect(report.runs.map((run) => run.wall)).toEqual(['left', 'back'])
    expect(cutListReport({ ...design, pieces: pieces.slice(0, 2) }, true).byWall).toBe(false)
  })

  it('names drawer groups by how many', () => {
    const groups = cutList([piece('d', 'drawer', { height: 200 })], design.thickness, [])
    expect(groups.map(groupName)).toContain('Drawer')
  })
})
