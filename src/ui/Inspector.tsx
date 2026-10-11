import { useEffect } from 'react'
import { selectedIdOf, useDesignStore } from '../store/useDesignStore'
import { useLayoutStore } from '../store/useLayoutStore'
import { BoxInspector } from './BoxInspector'
import { MultiInspector } from './MultiInspector'
import { PieceInspector } from './PieceInspector'

/**
 * The panel right of the canvas: settings for what's selected, or how to get
 * started when nothing is. Beside the canvas so it's always in view while editing.
 */
export function Inspector() {
  const selectedId = useDesignStore(selectedIdOf)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const pieces = useDesignStore((s) => s.pieces)
  const boxes = useDesignStore((s) => s.boxes)
  const piece = pieces.find((candidate) => candidate.id === selectedId)
  // A box's panel is edited through its box.
  const box = piece?.boxId ? boxes.find((candidate) => candidate.id === piece.boxId) : undefined

  // A newly selected part shows its panel in full, even if the last one was folded.
  useEffect(() => useLayoutStore.getState().setInspectorFolded(false), [selectedId])

  return (
    <aside className="inspector" aria-label="Selected">
      {/* Keyed by the selection, so a message like "Saved as block" doesn't carry over. */}
      {selectedIds.length > 1 ? (
        <MultiInspector key={selectedIds.join()} />
      ) : piece && box ? (
        <BoxInspector key={piece.id} box={box} panelId={piece.id} />
      ) : piece ? (
        <PieceInspector key={piece.id} piece={piece} />
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
