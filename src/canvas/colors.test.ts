import { describe, expect, it } from 'vitest'
import { DEFAULT_THICKNESS } from '../lib/defaults'
import { normalizePiece } from '../lib/geometry'
import type { Piece, PieceKind } from '../types'
import { BOARD_FILLS, EDGE_FILLS, FILLS, boardOf, edgeOnColor, faceColor, sharedColor } from './colors'

const piece = (kind: PieceKind, patch: Partial<Piece> = {}): Piece =>
  normalizePiece({ id: kind, kind, x: 0, y: 0, width: 600, height: 18, depth: 580, ...patch }, DEFAULT_THICKNESS)
const none = { boardColors: {}, edgeColors: {} }

describe('part colours', () => {
  it('knows each part’s board: a drawer is its front, a rod none', () => {
    expect([boardOf('shelf'), boardOf('back'), boardOf('door'), boardOf('drawer'), boardOf('rod')]).toEqual([
      'body',
      'back',
      'front',
      'front',
      null,
    ])
    expect(BOARD_FILLS.front).toBe(FILLS.door)
  })

  it('colours a face with the part’s own colour, else its board’s, else the standard look', () => {
    const colors = { boardColors: { body: '#eeeeee' }, edgeColors: {} }
    expect(faceColor(piece('shelf'), colors)).toBe('#eeeeee')
    expect(faceColor(piece('shelf', { color: '#123456' }), colors)).toBe('#123456')
    expect(faceColor(piece('door'), colors)).toBe(FILLS.door)
    // A drawer's box is cut from another board than its front.
    expect(faceColor(piece('drawer'), { boardColors: { drawer: '#abcdef' }, edgeColors: {} }, 'drawer')).toBe('#abcdef')
  })

  it('shows a banded edge facing the viewer in its banding colour', () => {
    const colors = { boardColors: { body: '#eeeeee' }, edgeColors: { body: '#222222' } }
    // A shelf's front edge is banded: from the front it's the banding colour.
    expect(edgeOnColor(piece('shelf'), 'front', colors)).toBe('#222222')
    // Its left edge isn't, so from the left it's the board's colour, darkened.
    expect(edgeOnColor(piece('shelf'), 'left', colors)).not.toBe('#222222')
    expect(edgeOnColor(piece('shelf'), 'left', colors)).not.toBe('#eeeeee')
    // Banding shows even over the part's own colour.
    expect(edgeOnColor(piece('shelf', { color: '#123456' }), 'front', colors)).toBe('#222222')
    expect(edgeOnColor(piece('shelf', { color: '#123456' }), 'left', colors)).toBe('#123456')
  })

  it('looks as it always did with no colours set', () => {
    expect(faceColor(piece('shelf'), none)).toBe(FILLS.shelf)
    expect(edgeOnColor(piece('shelf'), 'front', none)).toBe(EDGE_FILLS.shelf)
  })
})

describe('sharedColor', () => {
  it('is the colour all the parts have, or null when they differ or have none', () => {
    expect(sharedColor([{ color: '#112233' }, { color: '#112233' }])).toBe('#112233')
    expect(sharedColor([{ color: '#112233' }, {}])).toBeNull()
    expect(sharedColor([{}, {}])).toBeNull()
  })
})
