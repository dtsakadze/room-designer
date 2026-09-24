import { useState } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { BoardSettings } from './BoardSettings'
import { ComponentPalette } from './ComponentPalette'
import { PieceInspector } from './PieceInspector'
import { ProjectFileButtons } from './ProjectFileButtons'
import { type SaveStatus, useProjectsStore } from '../store/useProjectsStore'
import { EditableName } from './EditableName'
import { ProjectsPanel } from './ProjectsPanel'
import { DELETE_SHORTCUT, DUPLICATE_SHORTCUT, REDO_SHORTCUT, UNDO_SHORTCUT } from './shortcuts'

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Loading…',
  blocked: 'Updating storage: close other Room Designer tabs to continue',
  saving: 'Saving…',
  saved: 'Saved in this browser',
  unavailable: "Can't save: browser storage is unavailable",
}

export function Sidebar() {
  const saveStatus = useProjectsStore((s) => s.saveStatus)
  const current = useProjectsStore((s) => s.projects.find((project) => project.id === s.currentId))
  const renameProject = useProjectsStore((s) => s.renameProject)
  const [showProjects, setShowProjects] = useState(false)
  const selectedId = useDesignStore((s) => s.selectedId)
  const count = useDesignStore((s) => s.pieces.length)
  const clear = useDesignStore((s) => s.clear)

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="app-title">
          <h1>Room Designer</h1>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowProjects(true)}
            disabled={saveStatus !== 'saved' && saveStatus !== 'saving'}
          >
            Projects
          </button>
        </div>
        {current && (
          <EditableName
            key={current.id}
            className="project-title"
            name={current.name}
            onRename={(name) => renameProject(current.id, name)}
          />
        )}
        <p className="muted">{count} piece{count === 1 ? '' : 's'}</p>
        <p
          className={
            saveStatus === 'unavailable' || saveStatus === 'blocked'
              ? 'save-status save-status-error'
              : 'save-status'
          }
        >
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

      {showProjects && <ProjectsPanel onClose={() => setShowProjects(false)} />}
    </aside>
  )
}
