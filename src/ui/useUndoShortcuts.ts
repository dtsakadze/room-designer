import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Shortcut labels for buttons and hints, in the platform's own notation. */
export const UNDO_SHORTCUT = IS_MAC ? '⌘Z' : 'Ctrl+Z'
export const REDO_SHORTCUT = IS_MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z'

/**
 * ⌘Z / ⌘⇧Z on a Mac, Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) elsewhere. Inside a
 * text field the browser's own text undo wins, so typing isn't hijacked.
 */
export function useUndoShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = IS_MAC ? event.metaKey : event.ctrlKey
      if (!modifier || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return

      const key = event.key.toLowerCase()
      const redo = (key === 'z' && event.shiftKey) || (!IS_MAC && key === 'y')
      const undo = key === 'z' && !event.shiftKey
      if (!undo && !redo) return

      event.preventDefault()
      const { undo: undoStep, redo: redoStep } = useDesignStore.getState()
      if (redo) redoStep()
      else undoStep()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
