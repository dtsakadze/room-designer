import { useDesignStore } from '../store/useDesignStore'
import { REDO_SHORTCUT, UNDO_SHORTCUT } from './shortcuts'

/** Undo / redo, with the keyboard shortcut shown on each button. */
export function HistoryButtons() {
  const canUndo = useDesignStore((s) => s.past.length > 0)
  const canRedo = useDesignStore((s) => s.future.length > 0)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)

  return (
    <div className="history-tools">
      <button
        type="button"
        className="ghost-button"
        onClick={undo}
        disabled={!canUndo}
        title={`Undo (${UNDO_SHORTCUT})`}
      >
        Undo <kbd>{UNDO_SHORTCUT}</kbd>
      </button>
      <button
        type="button"
        className="ghost-button"
        onClick={redo}
        disabled={!canRedo}
        title={`Redo (${REDO_SHORTCUT})`}
      >
        Redo <kbd>{REDO_SHORTCUT}</kbd>
      </button>
    </div>
  )
}
