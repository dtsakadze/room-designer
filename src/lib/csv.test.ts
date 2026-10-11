import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { cutListCsv, cutListCsvByWall, hardwareCsv, hardwareCsvByWall, toCsv } from './csv'
import { cutList, hardwareList } from './cutList'
import { DEFAULT_THICKNESS, boardName } from './defaults'
import { normalizePiece } from './geometry'
import { formatLength, formatNumber } from './units'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: PieceKind, rect: Partial<Piece> = {}): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 600, height: 2000, depth: 580, ...rect }, thickness)
const lines = (csv: string) => csv.replace(/^﻿/, '').split('\r\n').filter(Boolean)

describe('CSV', () => {
  it('quotes fields with commas, quotes or line breaks, and marks the text as UTF-8', () => {
    const csv = toCsv([['a', 'b, c', 'say "hi"', 'two\nlines', 3]])
    expect(csv).toBe('﻿a,"b, c","say ""hi""","two\nlines",3\r\n')
  })

  it('keeps text that a spreadsheet would run as a formula from running', () => {
    const csv = toCsv([['=HYPERLINK("http://x","y")', '+1', '-2', '@SUM(A1)', '\tx', 'Oak', -5]])
    expect(csv).toBe('﻿"\'=HYPERLINK(""http://x"",""y"")",\'+1,\'-2,\'@SUM(A1),\'\tx,Oak,-5\r\n')
  })

  it('lists the cut list with its sections, sizes in the chosen units, grain and banding', () => {
    const groups = cutList(
      [
        piece('s', 'vertical', { width: 18, height: 2000 }),
        piece('d', 'door', { width: 600, height: 2000 }),
        piece('w', 'drawer', { x: 1000, width: 564, height: 200, depth: 550 }),
      ],
      thickness,
      ['front'],
    )
    const csv = cutListCsv(groups, {
      num: (mm) => formatNumber(mm, 'cm'),
      unit: 'cm',
      boardName: (board) => boardName(board, { front: '19 mm oak, veneered' }),
    })
    const [header, side, door, front] = lines(csv)
    expect(header).toBe(
      'Section,Part,Quantity,Length (cm),Width (cm),Thickness (cm),Board,Grain along length,Banded length edges,Banded width edges',
    )
    expect(side).toBe('Panels,Side panel,1,200,58,1.8,Body,No,1,0')
    expect(door).toBe('Doors,Door,1,200,60,1.8,"19 mm oak, veneered",Yes,2,2')
    expect(front).toMatch(/^"Drawer, front 56.4 × 20",Front,1,/)
  })

  it('lists the hardware with how many and in what', () => {
    const rows = hardwareList([piece('w', 'drawer', { width: 564, height: 200, depth: 550 })], thickness)
    expect(lines(hardwareCsv(rows, (mm) => formatLength(mm, 'mm')))).toEqual([
      'Item,Quantity,Unit',
      '"Drawer runners, standard, 500 mm",1,pairs',
      'Handles or knobs,1,pcs',
    ])
  })
})

describe('CSV by wall', () => {
  const format = {
    num: (mm: number) => formatNumber(mm, 'mm'),
    unit: 'mm',
    boardName: (board: Parameters<typeof boardName>[0]) => boardName(board, {}),
  }
  const back = [piece('a', 'shelf', { width: 564 }), piece('b', 'shelf', { width: 564 })]
  const left = [piece('c', 'vertical', { width: 18, wall: 'left' })]

  it('puts the wall first on every cut list row, and keeps the walls apart', () => {
    const csv = cutListCsvByWall(
      [
        { label: 'Back wall', groups: cutList(back, thickness) },
        { label: 'Left wall', groups: cutList(left, thickness) },
      ],
      format,
    )
    const rows = lines(csv).map((line) => line.split(','))
    expect(rows[0].slice(0, 3)).toEqual(['Wall', 'Section', 'Part'])
    expect(rows.slice(1).map((row) => [row[0], row[2], row[3]])).toEqual([
      ['Back wall', 'Adjustable shelf', '2'],
      ['Left wall', 'Side panel', '1'],
    ])
  })

  it('puts the wall first on every hardware row', () => {
    const csv = hardwareCsvByWall(
      [
        { label: 'Back wall', rows: hardwareList([piece('r', 'rod', { width: 1000, height: 25 })], thickness) },
        { label: 'Left wall', rows: hardwareList([piece('r2', 'rod', { width: 800, height: 25, wall: 'left' })], thickness) },
      ],
      (mm) => `${mm}`,
    )
    const rows = lines(csv).map((line) => line.split(','))
    expect(rows[0]).toEqual(['Wall', 'Item', 'Quantity', 'Unit'])
    expect(rows.filter((row) => row[0] === 'Left wall').length).toBeGreaterThan(0)
    expect(rows.slice(1).every((row) => ['Back wall', 'Left wall'].includes(row[0]))).toBe(true)
  })
})
