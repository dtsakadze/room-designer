import { describe, expect, it } from 'vitest'
import { accessoryLines } from './marks'

const area = { x0: 0, y0: 0, x1: 100, y1: 40 }

describe('accessoryLines', () => {
  it('draws each accessory its own way, and an untyped one as a basket', () => {
    expect(accessoryLines('trouser', area)).toHaveLength(5)
    expect(accessoryLines('tie', area).every(([x1, , x2]) => x1 === x2)).toBe(true)
    expect(accessoryLines(undefined, area)).toEqual(accessoryLines('basket', area))
    // Slanted slats lean right, but stay inside the area.
    expect(accessoryLines('shoes-angled', area).every(([x1, y1, x2, y2]) => x2 >= x1 && x2 <= 100 && y1 > y2)).toBe(true)
  })
})
