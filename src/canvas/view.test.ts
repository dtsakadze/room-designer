import { describe, expect, it } from 'vitest'
import { toDesignY, toSvgY, wheelZoomFactor } from './view'

const wheel = (deltaY: number, deltaMode = 0) => ({ deltaY, deltaMode }) as WheelEvent

describe('coordinates', () => {
  it('flips y between the design (up from the floor) and SVG (down)', () => {
    expect(toSvgY(100, 50)).toBe(-150)
    expect(toDesignY(-150)).toBe(150)
    expect(toDesignY(toSvgY(0, 0))).toBe(0)
  })
})

describe('wheelZoomFactor', () => {
  it('zooms out on a positive delta, in on a negative one, about 7% a notch', () => {
    expect(wheelZoomFactor(wheel(120))).toBeCloseTo(Math.exp(0.072))
    expect(wheelZoomFactor(wheel(-120))).toBeCloseTo(Math.exp(-0.072))
  })

  it('caps one event, and reads line and page deltas as pixels', () => {
    expect(wheelZoomFactor(wheel(100000))).toBeCloseTo(Math.exp(0.22))
    expect(wheelZoomFactor(wheel(3, 1))).toBeCloseTo(wheelZoomFactor(wheel(48)))
    expect(wheelZoomFactor(wheel(1, 2))).toBeCloseTo(Math.exp(0.22))
  })
})
