import { useDesignStore } from '../store/useDesignStore'
import { BoardSettings } from './BoardSettings'
import { ComponentPalette } from './ComponentPalette'
import { PieceInspector } from './PieceInspector'
import { ProjectFileButtons } from './ProjectFileButtons'
import type { SaveStatus } from './useAutosave'
import { DELETE_SHORTCUT, DUPLICATE_SHORTCUT, REDO_SHORTCUT, UNDO_SHORTCUT } from './shortcuts'

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Saved in this browser',
  unavailable: "Can't save: browser storage is unavailable",
}

export function Sidebar({ saveStatus }: { saveStatus: SaveStatus }) {
  const selectedId = useDesignStore((s) => s.selectedId)
  const count = useDesignStore((s) => s.pieces.length)
  const clear = useDesignStore((s) => s.clear)

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>room designer</h1>
        <p className="muted">{count} piece{count === 1 ? '' : 's'}</p>
        <p className={saveStatus === 'unavailable' ? 'save-status save-status-error' : 'save-status'}>
          {SAVE_LABELS[saveStatus]}
        </p>
      </header>

      <section className="section">
        <h2>Project</h2>
        <ProjectFileButtons />
      </section>

      <BoardSettings />

      <ComponentPalette />

      <section className="section">
        <h2>Selected</h2>
        {selectedId ? (
          <PieceInspector />
        ) : (
          <p className="muted">
            Add a component, then click it. Drag to move it, drag the blue handles to
            resize it. Arrow keys nudge by 10mm (hold shift for 100mm).
            {` ${DUPLICATE_SHORTCUT} duplicates, ${DELETE_SHORTCUT} deletes, ${UNDO_SHORTCUT} undoes and ${REDO_SHORTCUT} redoes.`}
          </p>
        )}
      </section>

      <footer className="sidebar-footer">
        <button
          type="button"
          className="ghost-button"
          onClick={clear}
          disabled={count === 0}
        >
          Clear all
        </button>
      </footer>
    </aside>
  )
}
