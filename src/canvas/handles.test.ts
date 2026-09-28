import { describe, expect, it } from 'vitest'
import { HANDLES, MIN_SIZE, handleCursor, handleKey, handleOutsets, resizePiece } from './handles'

const rect = { x: 0, y: 100, width: 500, height: 300 }
const exact = (mm: number) => mm
const tens = (mm: number) => Math.round(mm / 10) * 10

describe('resizePiece', () => {
  it('moves the dragged edges and keeps the opposite ones', () => {
    expect(resizePiece(rect, { hx: 1, hy: 0 }, 50, 0, exact)).toEqual({ ...rect, width: 550 })
    expect(resizePiece(rect, { hx: -1, hy: 0 }, 50, 0, exact)).toEqual({ ...rect, x: 50, width: 450 })
    expect(resizePiece(rect, { hx: 0, hy: 1 }, 0, 20, exact)).toEqual({ ...rect, height: 320 })
    expect(resizePiece(rect, { hx: 0, hy: -1 }, 0, 20, exact)).toEqual({ ...rect, y: 120, height: 280 })
    expect(resizePiece(rect, { hx: 1, hy: 1 }, 10, 10, exact)).toEqual({ ...rect, width: 510, height: 310 })
  })

  it('snaps the moving edge, not the size', () => {
    expect(resizePiece({ ...rect, x: 3 }, { hx: 1, hy: 0 }, 44, 0, tens)).toEqual({ ...rect, x: 3, width: 547 })
  })

  it('never turns a piece inside out', () => {
    expect(resizePiece(rect, { hx: 1, hy: 0 }, -900, 0, exact).width).toBe(MIN_SIZE)
    expect(resizePiece(rect, { hx: -1, hy: 0 }, 900, 0, exact)).toMatchObject({ x: 490, width: MIN_SIZE })
    expect(resizePiece(rect, { hx: 0, hy: 1 }, 0, -900, exact).height).toBe(MIN_SIZE)
  })

  it('stops the bottom edge at the floor', () => {
    expect(resizePiece(rect, { hx: 0, hy: -1 }, 0, -500, exact)).toMatchObject({ y: 0, height: 400 })
  })
})

describe('handles', () => {
  it('has eight distinct handles', () => {
    expect(new Set(HANDLES.map(handleKey)).size).toBe(8)
  })

  it('shows the matching resize cursor', () => {
    expect(handleCursor({ hx: 0, hy: 1 })).toBe('ns-resize')
    expect(handleCursor({ hx: -1, hy: 0 })).toBe('ew-resize')
    expect(handleCursor({ hx: 1, hy: 1 })).toBe('nesw-resize')
    expect(handleCursor({ hx: -1, hy: 1 })).toBe('nwse-resize')
  })

  it('pushes handles outside a board thinner than they are', () => {
    expect(handleOutsets({ x: 0, y: 0, width: 18, height: 2000 }, 10)).toEqual({ x: 4, y: 0 })
  })
})
