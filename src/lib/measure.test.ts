import { describe, expect, it } from 'vitest'
import { measure, snapPoint } from './measure'

const shelf = { x: 0, y: 500, width: 1000, height: 18 }

describe('snapPoint', () => {
  it('catches a nearby corner or edge middle first', () => {
    expect(snapPoint({ x: 6, y: 495 }, [shelf], 10)).toEqual({ x: 0, y: 500, snap: 'corner' })
    expect(snapPoint({ x: 503, y: 522 }, [shelf], 10)).toEqual({ x: 500, y: 518, snap: 'middle' })
  })

  it('falls back to the nearest point of an edge', () => {
    expect(snapPoint({ x: 250, y: 523 }, [shelf], 10)).toEqual({ x: 250, y: 518, snap: 'edge' })
  })

  it('leaves a point with nothing in reach where it is', () => {
    expect(snapPoint({ x: 250, y: 700 }, [shelf], 10)).toEqual({ x: 250, y: 700, snap: null })
  })
})

describe('measure', () => {
  it('gives the straight distance and its horizontal and vertical parts', () => {
    expect(measure({ x: 0, y: 0 }, { x: -300, y: 400 })).toEqual({ dx: 300, dy: 400, distance: 500 })
  })
})
