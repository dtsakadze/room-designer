import { CABINET_ID } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { AddPartButtons } from './AddPartButtons'
import { CabinetPanel } from './CabinetPanel'
import { PartInspector } from './PartInspector'

export function Sidebar() {
  const selectedId = useDesignStore((s) => s.selectedId)
  const partCount = useDesignStore((s) => s.cabinet.parts.length)
  const reset = useDesignStore((s) => s.reset)

  const hasPartSelected = selectedId !== null && selectedId !== CABINET_ID

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1>room designer</h1>
        <p className="muted">{partCount} part{partCount === 1 ? '' : 's'}</p>
      </header>

      <section className="section">
        <h2>Add</h2>
        <AddPartButtons />
      </section>

      <section className="section">
        <h2>Cabinet</h2>
        <CabinetPanel />
      </section>

      <section className="section">
        <h2>Selected</h2>
        {hasPartSelected ? (
          <PartInspector />
        ) : (
          <p className="muted">
            Click a part in the canvas to edit it, or drag it to move it around.
          </p>
        )}
      </section>

      <footer className="sidebar-footer">
        <button type="button" className="ghost-button" onClick={reset}>
          Reset design
        </button>
      </footer>
    </aside>
  )
}
