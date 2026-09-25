import { create } from 'zustand'
import { type Unit, formatLength, formatNumber, isUnit } from '../lib/units'

const UNIT_KEY = 'room-designer:unit'

/**
 * Preferences of the person using the app, not of a project: kept in
 * localStorage, the same in every project, and never in a save.
 */
type SettingsState = {
  unit: Unit
  setUnit: (unit: Unit) => void
}

function storedUnit(): Unit {
  try {
    const stored = localStorage.getItem(UNIT_KEY)
    if (isUnit(stored)) return stored
  } catch {
    // Blocked storage (private windows): fall back to millimetres.
  }
  return 'mm'
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  unit: storedUnit(),
  setUnit: (unit) => {
    try {
      localStorage.setItem(UNIT_KEY, unit)
    } catch {
      // Still applies for this visit.
    }
    set({ unit })
  },
}))

/** Formatters for the chosen unit: `num` for a bare number, `len` with the unit. */
export function useUnits() {
  const unit = useSettingsStore((s) => s.unit)
  return {
    unit,
    num: (mm: number) => formatNumber(mm, unit),
    len: (mm: number) => formatLength(mm, unit),
  }
}
