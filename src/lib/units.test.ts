import { describe, expect, it } from 'vitest'
import { formatLength, formatNumber, fromUnit } from './units'

describe('units', () => {
  it.each([
    ['mm', '1164'],
    ['cm', '116.4'],
    ['m', '1.164'],
    ['in', '45.83'],
  ] as const)('shows 1164 mm in %s as %s', (unit, shown) => {
    expect(formatNumber(1164, unit)).toBe(shown)
  })

  it('drops trailing zeros', () => {
    expect(formatNumber(600, 'cm')).toBe('60')
    expect(formatNumber(2000, 'm')).toBe('2')
    expect(formatLength(254, 'in')).toBe('10 in')
  })

  it.each([
    [116.4, 'cm', 1164],
    [1.164, 'm', 1164],
    [10, 'in', 254],
    [18, 'mm', 18],
  ] as const)('reads %s %s as %s mm', (value, unit, mm) => {
    expect(fromUnit(value, unit)).toBeCloseTo(mm)
  })

  it('round-trips whole millimetres through every unit', () => {
    for (const unit of ['mm', 'cm', 'm', 'in'] as const) {
      for (const mm of [0, 1, 3, 16, 18, 25, 580, 1164, 2000]) {
        const shown = Number(formatNumber(mm, unit))
        // Inches keep 2 decimals, so they can be off by a fraction of a mm.
        expect(Math.abs(fromUnit(shown, unit) - mm)).toBeLessThan(unit === 'in' ? 0.2 : 1e-9)
      }
    }
  })
})
