/**
 * Preferences of this browser (a unit, a folded section, the last paper size)
 * in localStorage. Storage can be blocked (private windows), so a read gives
 * null and a write is skipped: the preference still applies for this visit.
 * Keys keep the old `room-designer:` prefix, or what people stored is lost.
 */
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Still applies for this visit.
  }
}
