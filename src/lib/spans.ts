import type { BoardMaterial, BoardMaterials, Piece, Thickness } from '../types'

/**
 * How far a shelf can span between its supports before it sags under a normal
 * load (clothes and folded things), at an 18 mm board. A rule of thumb to
 * warn on, not an engineering figure: heavy loads such as books need less.
 * Chipboard is the most cautious and the default.
 */
const SHELF_SPAN_AT_18: Record<BoardMaterial, number> = {
  chipboard: 700,
  mdf: 650,
  plywood: 900,
  solid: 1000,
}

/** Sag falls off with thickness to roughly this power: a thicker board spans further, but not in proportion. */
const THICKNESS_POWER = 0.75

/** The longest a shelf can be between its supports, in mm, to the nearest 10. */
export function maxShelfSpan(material: BoardMaterial, thickness: number) {
  return Math.round((SHELF_SPAN_AT_18[material] * (thickness / 18) ** THICKNESS_POWER) / 10) * 10
}

/** A hanging rod of steel tube spans about this many times its diameter loaded with clothes (1200 mm for 25 mm). */
const ROD_SPAN_PER_DIAMETER = 48

/** The longest a rod can be between its supports, in mm, to the nearest 10. */
export const maxRodSpan = (diameter: number) => Math.round((diameter * ROD_SPAN_PER_DIAMETER) / 10) * 10

export type SpanWarning = { kind: 'shelf' | 'rod'; span: number; max: number }

/**
 * The shelves and rods longer than they can safely be between their supports,
 * by part id. A shelf's span is its width (it rests on a side or divider at
 * each end, so a wider bay needs a thicker or stiffer board, or a divider).
 */
export function spanWarnings(
  pieces: Piece[],
  thickness: Thickness,
  materials: BoardMaterials,
): Map<string, SpanWarning> {
  const warnings = new Map<string, SpanWarning>()
  const shelfMax = maxShelfSpan(materials.body ?? 'chipboard', thickness.body)
  for (const piece of pieces) {
    if (piece.kind === 'shelf' && piece.width > shelfMax) {
      warnings.set(piece.id, { kind: 'shelf', span: piece.width, max: shelfMax })
    } else if (piece.kind === 'rod' && piece.width > maxRodSpan(piece.height)) {
      warnings.set(piece.id, { kind: 'rod', span: piece.width, max: maxRodSpan(piece.height) })
    }
  }
  return warnings
}
