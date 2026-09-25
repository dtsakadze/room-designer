import type { Box, Piece, Thickness } from '../types'
import { type ProjectData, parseProject, toProjectData } from './project'

const KEY = 'room-designer:clipboard'

/**
 * What was copied, kept in memory and in localStorage: localStorage lets it
 * survive switching projects and reloading, and reach other tabs of the app.
 * It's stored as a project save, so pasting goes through the same checks and
 * format upgrades as opening a file.
 */
let copied: ProjectData | null = null

export function writeClipboard(parts: { pieces: Piece[]; boxes: Box[]; thickness: Thickness }) {
  copied = toProjectData(parts)
  try {
    localStorage.setItem(KEY, JSON.stringify(copied))
  } catch {
    // Storage may be full or blocked (private windows); copying still works in this tab.
  }
}

/** The copied parts, or null if there's nothing (usable) to paste. */
export function readClipboard(): ProjectData | null {
  try {
    const stored = localStorage.getItem(KEY)
    // Another tab may have copied something newer than this tab's memory.
    if (stored) return parseProject(JSON.parse(stored))
  } catch {
    // Unreadable or blocked storage: fall back to what this tab copied.
  }
  return copied
}

/** Calls back when another tab copies something, so paste buttons can update. */
export function onClipboardChange(callback: () => void) {
  const listener = (event: StorageEvent) => {
    if (event.key === KEY) callback()
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
