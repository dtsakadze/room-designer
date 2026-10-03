import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { cutListCsv, hardwareCsv, toCsv } from './csv'
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
