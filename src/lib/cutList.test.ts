import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { CUT_LIST_SECTIONS, cutList } from './cutList'
import { BOARD, DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'

const thickness = DEFAULT_THICKNESS
let next = 0
const piece = (kind: PieceKind, rect: Partial<Piece> = {}): Piece =>
  normalizePiece(
    { id: `p${next++}`, kind, x: 0, y: 0, width: 500, height: 500, depth: 400, ...rect },
    thickness,
  )

describe('cut list', () => {
  it('has a section for every kind of board, so none is left out', () => {
    const inSections = CUT_LIST_SECTIONS.flatMap((section): readonly PieceKind[] => section.kinds)
    for (const kind of Object.keys(BOARD)) expect(inSections).toContain(kind)
  })

  it('groups boards into sections, parts of a kind together, biggest first', () => {
    const groups = cutList(
      [
        piece('shelf', { width: 400 }),
        piece('back', { width: 1200, height: 2000 }),
        piece('vertical', { height: 2000 }),
        piece('shelf', { width: 800, fixed: true }),
        piece('horizontal', { width: 1200 }),
        piece('door', { width: 600, height: 2000 }),
        piece('vertical', { height: 2000 }),
        piece('shelf', { width: 800 }),
        piece('rod'),
      ],
      thickness,
    )
    expect(
      groups.map((group) => [group.section, group.rows.map((row) => [row.label, row.quantity, row.length])]),
    ).toEqual([
      [
        'panels',
        [
          ['Side panel', 2, 2000],
          ['Top / bottom', 1, 1200],
          ['Back panel', 1, 2000],
        ],
      ],
      [
        'shelves',
        [
          ['Adjustable shelf', 1, 800],
          ['Adjustable shelf', 1, 400],
          ['Fixed shelf', 1, 800],
        ],
      ],
      ['doors', [['Door', 1, 2000]]],
    ])
  })

  it('lists a drawer’s boards in the order it’s put together', () => {
    const [group] = cutList([piece('drawer', { width: 564, height: 200, depth: 550 })], thickness)
    expect(group.rows.map((row) => row.label)).toEqual(['Front', 'Side', 'Back', 'Bottom'])
  })
})
