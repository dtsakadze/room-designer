import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { useLayoutStore } from '../store/useLayoutStore'
import { MultiInspector } from './MultiInspector'
import { PieceInspector } from './PieceInspector'

/**
 * The panel right of the canvas: settings for what's selected, or how to get
 * started when nothing is. Beside the canvas so it's always in view while editing.
 */
export function Inspector() {
  const selectedId = useDesignStore((s) => s.selectedId)
  const selectedIds = useDesignStore((s) => s.selectedIds)

  // A newly selected part shows its panel in full, even if the last one was folded.
  useEffect(() => useLayoutStore.getState().setInspectorFolded(false), [selectedId])

  return (
    <aside className="inspector" aria-label="Selected">
      {/* Keyed by the selection, so a message like "Saved as block" doesn't carry over. */}
      {selectedIds.length > 1 ? (
        <MultiInspector key={selectedIds.join()} />
      ) : selectedId ? (
        <PieceInspector key={selectedId} />
      ) : (
        <div className="inspector-body">
          <h2 className="inspector-empty-title">Selected</h2>
          <p className="muted">
            Select a part to change its size, position or colour. Drag it to move it, and drag the
            blue handles to resize it. Every keyboard shortcut is under Shortcuts, bottom right.
          </p>
        </div>
      )}
    </aside>
  )
}
