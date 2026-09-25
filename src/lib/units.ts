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

export const isUnit = (value: unknown): value is Unit =>
  typeof value === 'string' && value in UNITS

/** A typed number in `unit`, as millimetres. */
export const fromUnit = (value: number, unit: Unit) => value * UNITS[unit].mm

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
