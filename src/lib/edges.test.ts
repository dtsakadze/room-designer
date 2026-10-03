import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { BOARD, DEFAULT_THICKNESS } from './defaults'
import { autoBands, autoGrain, bandsOf, boardEdges, edgeRunsAlong, grainOf } from './edges'
import { normalizePiece } from './geometry'

const piece = (kind: PieceKind, patch: Partial<Piece> = {}): Piece =>
  normalizePiece(
    { id: 'p', kind, x: 0, y: 0, width: 500, height: 500, depth: 400, ...patch },
    DEFAULT_THICKNESS,
  )

describe('board edges', () => {
  it('names the four edges round a board’s face', () => {
    expect(boardEdges('width')).toEqual(['front', 'back', 'top', 'bottom'])
    expect(boardEdges('height')).toEqual(['front', 'back', 'left', 'right'])
    expect(boardEdges('depth')).toEqual(['top', 'bottom', 'left', 'right'])
  })

  it('runs each edge along the face dimension it doesn’t face', () => {
    // A side panel's front edge runs up its height; a shelf's along its width.
    expect(edgeRunsAlong('front', 'width')).toBe('height')
    expect(edgeRunsAlong('front', 'height')).toBe('width')
    expect(edgeRunsAlong('left', 'depth')).toBe('height')
  })
})

describe('usual banding and grain', () => {
  it('bands the edges that show', () => {
    expect(autoBands({ kind: 'vertical' })).toEqual(['front'])
    expect(autoBands({ kind: 'shelf' })).toEqual(['front'])
    expect(autoBands({ kind: 'rail' })).toEqual(['front'])
    expect(autoBands({ kind: 'rail', railAt: 'back' })).toEqual([])
    expect(autoBands({ kind: 'back' })).toEqual([])
    expect(autoBands({ kind: 'door' })).toEqual(['top', 'bottom', 'left', 'right'])
  })

  it('gives every board an edge of its own and a grain along its face', () => {
    for (const [kind, board] of Object.entries(BOARD)) {
      const edges = boardEdges(board.axis)
      for (const edge of autoBands({ kind: kind as PieceKind })) expect(edges).toContain(edge)
      expect(autoGrain(kind as PieceKind)).not.toBe(board.axis)
      expect(autoGrain(kind as PieceKind)).not.toBeNull()
    }
    expect(autoGrain('rod')).toBeNull()
  })

  it('follows a part’s own choice', () => {
    expect(bandsOf(piece('shelf', { bands: ['front', 'back'] }))).toEqual(['front', 'back'])
    expect(grainOf(piece('door', { grain: 'width' }))).toBe('width')
    expect(grainOf(piece('door'))).toBe('height')
  })
})

describe('normalizing banding and grain', () => {
  it('stores only what differs from the usual, in a fixed order', () => {
    expect(piece('shelf', { bands: ['front'] }).bands).toBeUndefined()
    expect(piece('shelf', { bands: ['back', 'front', 'back'] }).bands).toEqual(['front', 'back'])
    expect(piece('shelf', { bands: [] }).bands).toEqual([])
    expect(piece('door', { grain: 'height' }).grain).toBeUndefined()
  })

  it('drops edges and grain a part can’t have', () => {
    // A shelf's top is its face, and its thickness can't carry grain.
    expect(piece('shelf', { bands: ['top', 'front', 'back'] }).bands).toEqual(['front', 'back'])
    expect(piece('shelf', { grain: 'height' }).grain).toBeUndefined()
    expect(piece('rod', { bands: ['front'], grain: 'width' })).not.toHaveProperty('bands')
    expect(piece('rod', { grain: 'width' })).not.toHaveProperty('grain')
    // A drawer has no banding of its own, but its front's grain can turn.
    expect(piece('drawer', { bands: ['top'] })).not.toHaveProperty('bands')
    expect(piece('drawer', { grain: 'height' }).grain).toBe('height')
    expect(piece('drawer', { grain: 'depth' })).not.toHaveProperty('grain')
  })
})
