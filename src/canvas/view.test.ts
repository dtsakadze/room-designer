import { describe, expect, it } from 'vitest'
import { INITIAL_VIEW, MAX_VIEW_WIDTH, fitView, toDesignY, toSvgY, wheelZoomFactor, zoomAround } from './view'

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

describe('zoomAround', () => {
  it('keeps the anchor where it is on screen', () => {
    const view = { x: -1000, y: -2000, w: 2000, h: 1600 }
    const anchor = { x: 200, y: -500 }
    const zoomed = zoomAround(view, anchor, 0.5)
    expect(zoomed.w).toBe(1000)
    expect(zoomed.h).toBe(800)
    // The anchor is the same share of the way across and down.
    expect((anchor.x - zoomed.x) / zoomed.w).toBeCloseTo((anchor.x - view.x) / view.w)
    expect((anchor.y - zoomed.y) / zoomed.h).toBeCloseTo((anchor.y - view.y) / view.h)
  })

  it('stops at the zoom limits', () => {
    expect(zoomAround({ x: 0, y: 0, w: 30000, h: 20000 }, { x: 0, y: 0 }, 10).w).toBe(MAX_VIEW_WIDTH)
  })
})

describe('fitView', () => {
  it('frames the parts with a margin, the floor at the bottom', () => {
    expect(fitView([{ x: -600, y: 0, width: 1200, height: 2000 }], 300)).toEqual({ x: -900, y: -2300, w: 1800, h: 2600 })
  })

  it('goes back to the starting view with nothing to frame', () => {
    expect(fitView([])).toEqual(INITIAL_VIEW)
  })
})
