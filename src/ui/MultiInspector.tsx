import { useDesignStore } from '../store/useDesignStore'
import { ColorField } from './ColorField'
import { DELETE_SHORTCUT } from './shortcuts'

/** What the inspector shows with several parts selected: colour them, or delete them. */
export function MultiInspector() {
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const pieces = useDesignStore((s) => s.pieces)
  const setPieceColors = useDesignStore((s) => s.setPieceColors)
  const removePieces = useDesignStore((s) => s.removePieces)

  const selected = pieces.filter((piece) => selectedIds.includes(piece.id))
  // Show a colour only when they all share one.
  const colors = new Set(selected.map((piece) => piece.color ?? null))
  const shared = colors.size === 1 ? [...colors][0] : null
  const anyColored = selected.some((piece) => piece.color)

  return (
    <div className="stack">
      <p className="muted">{selected.length} parts selected</p>
      <ColorField
        key={selectedIds.join()}
        label="Parts colour"
        value={shared}
        fallback="#d8c9a3"
        onChange={(color) => setPieceColors(selectedIds, color)}
        onReset={() => setPieceColors(selectedIds, null)}
        resetLabel="Reset all"
      />
      {anyColored && !shared && (
        <button
          type="button"
          className="ghost-button"
          onClick={() => setPieceColors(selectedIds, null)}
        >
          Reset colours to standard
        </button>
      )}
      <button
        type="button"
        className="danger-button"
        onClick={() => removePieces(selectedIds)}
        title={`Delete (${DELETE_SHORTCUT})`}
      >
        Delete {selected.length} parts <kbd>{DELETE_SHORTCUT}</kbd>
      </button>
    </div>
  )
}
