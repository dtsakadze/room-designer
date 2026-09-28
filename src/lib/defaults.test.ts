import { describe, expect, it } from 'vitest'
import type { PieceKind } from '../types'
import {
  BOARD,
  BOARDS,
  DEFAULT_THICKNESS,
  PIECE_GROUPS,
  PIECE_LABELS,
  boardName,
  createPiece,
  pieceLabel,
} from './defaults'

const kinds = Object.keys(PIECE_LABELS) as PieceKind[]

describe('createPiece', () => {
  it.each(kinds)('makes a %s centred on x = 0, on the floor', (kind) => {
    const piece = createPiece(kind, 'p', DEFAULT_THICKNESS)
    expect(piece).toMatchObject({ id: 'p', kind, y: 0 })
    expect(piece.x).toBe(-piece.width / 2)
    expect(Math.min(piece.width, piece.height, piece.depth)).toBeGreaterThan(0)
  })

  it('gives a board its board’s thickness', () => {
    const thickness = { body: 25, back: 6, front: 21, drawer: 15 }
    expect(createPiece('vertical', 'p', thickness).width).toBe(25)
    expect(createPiece('back', 'p', thickness).depth).toBe(6)
    expect(createPiece('door', 'p', thickness).depth).toBe(21)
  })

  it('follows the unit depth', () => {
    expect(createPiece('vertical', 'p', DEFAULT_THICKNESS, 350).depth).toBe(350)
    expect(createPiece('shelf', 'p', DEFAULT_THICKNESS, 350).depth).toBe(330)
  })
})

describe('labels', () => {
  it('tells shelves, rails and doors apart', () => {
    expect(pieceLabel({ kind: 'shelf', fixed: true })).toBe('Fixed shelf')
    expect(pieceLabel({ kind: 'shelf' })).toBe('Adjustable shelf')
    expect(pieceLabel({ kind: 'rail', railAt: 'back' })).toBe('Back rail')
    expect(pieceLabel({ kind: 'rail' })).toBe('Front rail')
    expect(pieceLabel({ kind: 'door', double: true })).toBe('Double door')
    expect(pieceLabel({ kind: 'drawer' })).toBe('Drawer')
  })

  it('offers every kind in the sidebar', () => {
    expect(PIECE_GROUPS.flatMap((group) => group.kinds).sort()).toEqual([...kinds].sort())
  })
})

describe('boards', () => {
  it('names a board by its own name, or its role', () => {
    expect(boardName('front', { front: '19 mm oak MDF' })).toBe('19 mm oak MDF')
    expect(boardName('drawer', {})).toBe('Drawer boxes')
  })

  it('lists every board a part can be cut from', () => {
    const keys = BOARDS.map((board) => board.key)
    expect(keys).toEqual(Object.keys(DEFAULT_THICKNESS))
    for (const board of Object.values(BOARD)) expect(keys).toContain(board.board)
  })
})
