import { useState } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { BoardSettings } from './BoardSettings'
import { CollapsibleSection } from './CollapsibleSection'
import { ComponentPalette } from './ComponentPalette'
import { PartsList } from './PartsList'
import { ProjectFileButtons } from './ProjectFileButtons'
import { type SaveStatus, useProjectsStore } from '../store/useProjectsStore'
import { EditableName } from './EditableName'
import { ProjectsPanel } from './ProjectsPanel'
import { useClashes } from './useClashes'
import { VersionInfo } from './WhatsNew'


const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Loading…',
  blocked: 'Updating storage: close other Boardcut tabs to continue',
  saving: 'Saving…',
  saved: 'Saved in this browser',
  unavailable: "Can't save: browser storage is unavailable",
}

export function Sidebar() {
  const saveStatus = useProjectsStore((s) => s.saveStatus)
  const current = useProjectsStore((s) => s.projects.find((project) => project.id === s.currentId))
  const renameProject = useProjectsStore((s) => s.renameProject)
  const [showProjects, setShowProjects] = useState(false)
  const hasClashes = useClashes().size > 0
  const count = useDesignStore((s) => s.pieces.length)
  const clear = useDesignStore((s) => s.clear)

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="app-title">
          <h1>Boardcut</h1>
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
        <VersionInfo />
      </header>

      <div className="sidebar-body">
        <CollapsibleSection id="add" title="Add" defaultOpen>
          <ComponentPalette />
        </CollapsibleSection>
        <CollapsibleSection
          id="parts"
          title="Parts"
          defaultOpen
          badge={count}
          // Flagged on the header too, so it shows while the section is folded.
          alert={hasClashes ? 'Some parts overlap' : undefined}
        >
          <PartsList />
          <button type="button" className="ghost-button" onClick={clear} disabled={count === 0}>
            Clear all
          </button>
        </CollapsibleSection>
        <CollapsibleSection id="settings" title="Settings">
          <BoardSettings />
        </CollapsibleSection>
        <CollapsibleSection id="file" title="File">
          <ProjectFileButtons />
        </CollapsibleSection>
      </div>

      {showProjects && <ProjectsPanel onClose={() => setShowProjects(false)} />}
    </aside>
  )
}
