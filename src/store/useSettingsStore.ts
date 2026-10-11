import { create } from 'zustand'
import { HANGING_GUIDES, type HangingGuide, MAX_HANGING_GUIDES } from '../lib/defaults'
import { type Unit, UNITS, formatLength, formatNumber, isUnit } from '../lib/units'

const UNIT_KEY = 'room-designer:unit'
const SHOW_DOORS_KEY = 'room-designer:show-doors'
const SHOW_GUIDES_KEY = 'room-designer:show-hanging-guides'
const GUIDES_KEY = 'room-designer:hanging-guides'
const BY_WALL_KEY = 'room-designer:cut-list-by-wall'

/**
 * Preferences of the person using the app, not of a project: kept in
 * localStorage, the same in every project, and never in a save.
 */
type SettingsState = {
  unit: Unit
  setUnit: (unit: Unit) => void
  /** Doors drawn in every view; off to get at the inside of the unit. */
  showDoors: boolean
  setShowDoors: (show: boolean) => void
  /** The cut list in a room with side walls: one list for each wall, or all together. */
  cutListByWall: boolean
  setCutListByWall: (byWall: boolean) => void
  /** Dashed lines under a selected hanging rod; off to keep the drawing clear. */
  showHangingGuides: boolean
  setShowHangingGuides: (show: boolean) => void
  /** How far each kind of clothes hangs below the rod, in mm. */
  hangingGuides: HangingGuide[]
  setHangingGuides: (guides: HangingGuide[]) => void
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

/** Whatever isn't a usable list of guides is replaced by the standard two. */
function storedGuides(): HangingGuide[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUIDES_KEY) ?? 'null')
    if (!Array.isArray(parsed) || parsed.length > MAX_HANGING_GUIDES) return HANGING_GUIDES
    const guides = parsed.filter(
      (g): g is HangingGuide =>
        typeof g?.label === 'string' && Number.isFinite(g.length) && g.length > 0,
    )
    return guides.length === parsed.length ? guides : HANGING_GUIDES
  } catch {
    return HANGING_GUIDES
  }
}

/** A stored on/off setting: only the opposite of the default, stored as such, changes it. */
function storedBoolean(key: string, otherwise: boolean) {
  try {
    return localStorage.getItem(key) === String(!otherwise) ? !otherwise : otherwise
  } catch {
    return otherwise
  }
}

/** Keeps a setting for next time; if storage is blocked, it still applies for this visit. */
function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Still applies for this visit.
  }
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  unit: storedUnit(),
  setUnit: (unit) => {
    persist(UNIT_KEY, unit)
    set({ unit })
  },
  showDoors: storedBoolean(SHOW_DOORS_KEY, true),
  setShowDoors: (showDoors) => {
    persist(SHOW_DOORS_KEY, String(showDoors))
    set({ showDoors })
  },
  cutListByWall: storedBoolean(BY_WALL_KEY, false),
  setCutListByWall: (cutListByWall) => {
    persist(BY_WALL_KEY, String(cutListByWall))
    set({ cutListByWall })
  },
  showHangingGuides: storedBoolean(SHOW_GUIDES_KEY, true),
  setShowHangingGuides: (showHangingGuides) => {
    persist(SHOW_GUIDES_KEY, String(showHangingGuides))
    set({ showHangingGuides })
  },
  hangingGuides: storedGuides(),
  setHangingGuides: (hangingGuides) => {
    persist(GUIDES_KEY, JSON.stringify(hangingGuides))
    set({ hangingGuides })
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

/** The unit's short name ("mm"), for the title of a group of fields that leave it out. */
export function useUnitLabel() {
  return UNITS[useSettingsStore((s) => s.unit)].label
}
