import { useEffect } from 'react'
import { SNAP } from '../lib/defaults'
import { selectedIdOf, useDesignStore } from '../store/useDesignStore'
import { escapeOwnedByOverlay, hasModifier, isFieldTarget, isOverlayOpen } from '../ui/shortcuts'
import { resizeByKey } from './handles'
import { type ViewName, visiblePieces } from './views'

/** Which way each arrow key nudges, in steps. */
const NUDGE: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
}

/**
 * The canvas's keys: ⌘A selects every part in view, ⌘C / ⌘V copy and paste
 * (Ctrl elsewhere); with a selection, the arrows nudge it (⇧ for bigger
 * steps), ⌘ + an arrow resizes it, ⌘D duplicates it, Delete removes it and
 * Escape lets go of it. Moving and resizing go along the front view's axes,
 * so only there. Keys typed in a field, or with a dialog or menu open, are
 * left alone; the Measure tool takes Escape while it's on.
 */
export function useCanvasShortcuts({
  viewName,
  showDoors,
  measuring,
}: {
  viewName: ViewName
  showDoors: boolean
  measuring: boolean
}) {
  const selectedId = useDesignStore(selectedIdOf)
  const isFront = viewName === 'front'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFieldTarget(event.target) || isOverlayOpen()) return
      if (!hasModifier(event) || event.shiftKey || event.altKey) return
      // Leave copying selected text on the page to the browser.
      if (window.getSelection()?.toString()) return
      const store = useDesignStore.getState()
      const key = event.key.toLowerCase()
      if (key === 'a') {
        // Everything in view: the wall being edited, or the whole room from the top.
        const all = visiblePieces(store.pieces, { showDoors, wall: viewName === 'top' ? undefined : store.activeWall })
        store.selectMany(all.map((piece) => piece.id))
      } else if (key === 'c' && store.selectedIds.length > 0) store.copySelection()
      else if (key === 'v' && store.canPaste) store.paste()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewName, showDoors])

  useEffect(() => {
    if (!selectedId) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (isFieldTarget(event.target)) return
      const store = useDesignStore.getState()

      if (event.key === 'Escape') {
        if (measuring || escapeOwnedByOverlay()) return
        event.preventDefault()
        store.select(null)
        return
      }

      if (isOverlayOpen()) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        store.removePieces(store.selectedIds)
        return
      }

      // Also stops the browser's own ⌘D / Ctrl+D (bookmark this page).
      if (hasModifier(event) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        // Duplicating acts on one part at a time.
        if (store.selectedIds.length === 1) store.duplicatePiece(selectedId)
        return
      }

      const step = event.shiftKey ? SNAP * 10 : SNAP

      // ⌘ (Ctrl) with an arrow resizes the selected part: the right and top edges move.
      // Also stops the browser's own ⌘← (back).
      if (hasModifier(event) && !event.altKey && event.key.startsWith('Arrow')) {
        event.preventDefault()
        if (isFront) store.resizeSelection((rect) => resizeByKey(rect, event.key, step))
        return
      }

      const direction = NUDGE[event.key]
      if (!direction || !isFront) return
      event.preventDefault()
      // A big step (⇧) moves an adjustable shelf by the grid, not by holes.
      store.nudgeSelection(direction.x * step, direction.y * step, !event.shiftKey)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, isFront, measuring])
}
