import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { drawOrder, piecesAt } from './views'

const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}): Piece => ({
  id,
  kind,
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
  depth: 18,
  ...rect,
})

describe('clicking through a stack', () => {
  const back = piece('back', 'back')
  const shelf = piece('shelf', 'shelf', { y: 400, height: 18 })
  const door = piece('door', 'door')
  const pieces = [door, back, shelf]

  it('draws the back panel underneath and doors on top in the front view', () => {
    expect(drawOrder(pieces, 'front').map((p) => p.id)).toEqual(['back', 'shelf', 'door'])
  })

  it('goes from the door to the parts inside, then the back panel', () => {
    expect(piecesAt(pieces, 500, 405, 'front').map((p) => p.id)).toEqual(['door', 'shelf', 'back'])
    expect(piecesAt(pieces, 500, 800, 'front').map((p) => p.id)).toEqual(['door', 'back'])
  })

  it('keeps doors underneath from behind, where they are furthest away', () => {
    expect(piecesAt(pieces, 500, 405, 'back').map((p) => p.id)).toEqual(['shelf', 'back', 'door'])
  })
})
