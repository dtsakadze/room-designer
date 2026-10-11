import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { boxFaces, finishOf } from './finish'

const none = { boardColors: {}, edgeColors: {} }
const shelf = { id: 's', kind: 'shelf', x: 0, y: 0, width: 600, height: 18, depth: 560 } as Piece

describe('boxFaces', () => {
  it('turns a part’s edges with its wall', () => {
    expect(boxFaces({})).toEqual({ right: 0, left: 1, top: 2, bottom: 3, front: 4, back: 5 })
    // The left wall's parts face +x and run front to back (-z).
    expect(boxFaces({ wall: 'left' })).toMatchObject({ right: 5, left: 4, front: 0, back: 1 })
    expect(boxFaces({ wall: 'right' })).toMatchObject({ right: 4, left: 5, front: 1, back: 0 })
  })
})

describe('finishOf', () => {
  it('bands only when the board’s banding has a colour', () => {
    expect(finishOf(shelf, 'body', ['front'], none, null).bandedFaces).toEqual([])
    const banded = finishOf(shelf, 'body', ['front'], { ...none, edgeColors: { body: '#112233' } }, 0)
    expect(banded).toMatchObject({ edge: '#112233', bandedFaces: [4], grainAxis: 0 })
  })
})
