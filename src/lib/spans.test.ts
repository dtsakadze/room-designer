import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'
import { maxRodSpan, maxShelfSpan, spanWarnings } from './spans'

const thickness = DEFAULT_THICKNESS
const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece>): Piece =>
  normalizePiece({ id, kind, x: 0, y: 0, width: 600, height: 18, depth: 400, ...rect }, thickness)

describe('max shelf span', () => {
  it('depends on the material, with chipboard the most cautious of the common ones', () => {
    expect(maxShelfSpan('chipboard', 18)).toBe(700)
    expect(maxShelfSpan('plywood', 18)).toBeGreaterThan(maxShelfSpan('chipboard', 18))
    expect(maxShelfSpan('solid', 18)).toBeGreaterThan(maxShelfSpan('plywood', 18))
    expect(maxShelfSpan('mdf', 18)).toBeLessThan(maxShelfSpan('chipboard', 18))
  })

  it('grows with thickness, but not in proportion', () => {
    const [thin, normal, thick] = [12, 18, 36].map((t) => maxShelfSpan('chipboard', t))
    expect(thin).toBeLessThan(normal)
    expect(thick).toBeGreaterThan(normal)
    expect(thick).toBeLessThan(2 * normal)
  })
})

describe('max rod span', () => {
  it('is 1200 mm for a 25 mm rod, more for a thicker one', () => {
    expect(maxRodSpan(25)).toBe(1200)
    expect(maxRodSpan(32)).toBeGreaterThan(1200)
  })
})

describe('span warnings', () => {
  it('flags only shelves and rods that are too long, with their limit', () => {
    const pieces = [
      piece('ok', 'shelf', { width: 700 }),
      piece('long', 'shelf', { width: 900 }),
      piece('rod', 'rod', { width: 1500, height: 25 }),
      piece('rod-ok', 'rod', { width: 1100, height: 25 }),
      piece('side', 'vertical', { width: 18, height: 2000 }),
    ]
    const warnings = spanWarnings(pieces, thickness, {})
    expect([...warnings.keys()]).toEqual(['long', 'rod'])
    expect(warnings.get('long')).toEqual({ kind: 'shelf', span: 900, max: 700 })
    expect(warnings.get('rod')).toEqual({ kind: 'rod', span: 1500, max: 1200 })
  })

  it('follows the body board’s material', () => {
    const shelf = piece('s', 'shelf', { width: 900 })
    expect(spanWarnings([shelf], thickness, { body: 'plywood' }).size).toBe(0)
    expect(spanWarnings([shelf], thickness, { body: 'mdf' }).size).toBe(1)
    // Only the body board counts: a shelf is cut from it.
    expect(spanWarnings([shelf], thickness, { front: 'solid' }).size).toBe(1)
  })
})
