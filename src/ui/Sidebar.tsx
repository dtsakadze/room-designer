import { useDesignStore } from '../store/useDesignStore'
import { ComponentPalette } from './ComponentPalette'
import { PieceInspector } from './PieceInspector'

export function Sidebar() {
  const selectedId = useDesignStore((s) => s.selectedId)
  const count = useDesignStore((s) => s.pieces.length)
  const clear = useDesignStore((s) => s.clear)

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>room designer</h1>
        <p className="muted">{count} piece{count === 1 ? '' : 's'}</p>
      </header>

      <ComponentPalette />

      <section className="section">
        <h2>Selected</h2>
        {selectedId ? (
          <PieceInspector />
        ) : (
          <p className="muted">
            Add a component, then click it. Drag to move it, drag the blue handles to
            resize it. Arrow keys nudge by 10mm (hold shift for 100mm), Delete removes.
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
