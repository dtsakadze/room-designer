/**
 * Units lengths are shown and typed in. Designs are always stored in whole
 * millimetres; a unit only changes what's displayed and how typed numbers are
 * read, so it doesn't touch the save format.
 */
export type Unit = 'mm' | 'cm' | 'm' | 'in'

export const UNITS: Record<Unit, { label: string; mm: number; decimals: number }> = {
  mm: { label: 'mm', mm: 1, decimals: 0 },
  cm: { label: 'cm', mm: 10, decimals: 1 },
  m: { label: 'm', mm: 1000, decimals: 3 },
  in: { label: 'in', mm: 25.4, decimals: 2 },
}

export const UNIT_ORDER: Unit[] = ['mm', 'cm', 'm', 'in']

// `Object.hasOwn` so inherited names such as `toString` aren't units.
export const isUnit = (value: unknown): value is Unit =>
  typeof value === 'string' && Object.hasOwn(UNITS, value)

/** A typed number in `unit`, as millimetres. */
export const fromUnit = (value: number, unit: Unit) => value * UNITS[unit].mm

/**
 * Typed text as millimetres, or null while it isn't a usable length yet
 * (empty, half-typed, or so big it overflows to Infinity once in mm: 1e308 cm
 * is a number, but 1e309 mm isn't). A comma works as the decimal separator.
 */
export function parseLength(text: string, unit: Unit) {
  if (text.trim() === '') return null
  const mm = fromUnit(Number(text.replace(',', '.')), unit)
  return Number.isFinite(mm) ? mm : null
}

/**
 * A length as a plain number in `unit`, rounded to the unit's precision with
 * trailing zeros dropped: 1164 mm is "1164", "116.4" cm, "1.164" m, "45.83" in.
 */
export function formatNumber(mm: number, unit: Unit) {
  const { mm: size, decimals } = UNITS[unit]
  return String(Number((mm / size).toFixed(decimals)))
}

/** A length with its unit, e.g. "116.4 cm". */
export const formatLength = (mm: number, unit: Unit) =>
  `${formatNumber(mm, unit)} ${UNITS[unit].label}`
