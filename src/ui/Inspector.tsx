import { useDesignStore } from '../store/useDesignStore'
import { MultiInspector } from './MultiInspector'
import { PieceInspector } from './PieceInspector'

/**
 * The panel right of the canvas: settings for what's selected, or how to get
 * started when nothing is. Beside the canvas so it's always in view while editing.
 */
export function Inspector() {
  const selectedId = useDesignStore((s) => s.selectedId)
  const selectedIds = useDesignStore((s) => s.selectedIds)

  return (
    <aside className="inspector" aria-label="Selected">
      <h2>Selected</h2>
      {selectedIds.length > 1 ? (
        <MultiInspector />
      ) : selectedId ? (
        <PieceInspector />
      ) : (
        <p className="muted">
          Select a part to change its size, position or colour. Drag it to move it, and drag the
          blue handles to resize it. Every keyboard shortcut is under Shortcuts, bottom right.
        </p>
      )}
    </aside>
  )
}
