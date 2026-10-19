import { useEffect, useState } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { closeSidebar, useLayoutStore } from '../store/useLayoutStore'
import { CollapsibleSection } from './CollapsibleSection'
import { ComponentPalette } from './ComponentPalette'
import { PartsList } from './PartsList'
import { ProjectMenu } from './ProjectMenu'
import { type SaveStatus, useProjectsStore } from '../store/useProjectsStore'
import { EditableName } from './EditableName'
import { ProjectsPanel } from './ProjectsPanel'
import { RoomSettings } from './RoomSettings'
import { LAYOUT_LABELS, layoutOf } from '../lib/room'
import { useClashes } from './useClashes'
import { VersionInfo } from './WhatsNew'
import { PrintDialog } from './PrintDialog'
import { SettingsDialog, type SettingsPage } from './SettingsDialog'
import { hasModifier } from './shortcuts'
import { ICON_PROPS } from './icons'
import { DRIVE_LABELS, useDriveStore } from '../store/useDriveStore'

// The everyday states are a word next to the app name; the problems get a
// line of their own, since they need doing something about.
const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Loading…',
  blocked: 'Updating storage: close other Boardcut tabs to continue',
  saving: 'Saving…',
  saved: 'Saved',
  unavailable: "Can't save: browser storage is unavailable",
}

export function Sidebar() {
  const saveStatus = useProjectsStore((s) => s.saveStatus)
  const saveProblem = saveStatus === 'unavailable' || saveStatus === 'blocked'
  const driveStatus = useDriveStore((s) => (s.connected ? s.status : null))
  const current = useProjectsStore((s) => s.projects.find((project) => project.id === s.currentId))
  const renameProject = useProjectsStore((s) => s.renameProject)
  const [showProjects, setShowProjects] = useState(false)
  const printOpen = useLayoutStore((s) => s.printOpen)
  const setPrintOpen = useLayoutStore((s) => s.setPrintOpen)
  /** The settings page open, or 'last' for wherever they were left. */
  const [settings, setSettings] = useState<SettingsPage | 'last' | null>(null)

  // ⌘P prints the drawings and cut list, rather than the browser printing the
  // screen. Unlike other shortcuts it works in text fields too, since there
  // it would otherwise print the screen.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasModifier(event) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'p') return
      event.preventDefault()
      setPrintOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setPrintOpen])
  const hasClashes = useClashes().size > 0
  const count = useDesignStore((s) => s.pieces.length)
  const layout = useDesignStore((s) => layoutOf(s.room))

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="app-title">
          <button
            type="button"
            className="icon-button sidebar-close compact-only"
            aria-label="Close the sidebar"
            onClick={closeSidebar}
          >
            ×
          </button>
          <h1>Boardcut</h1>
          {!saveProblem && (
            <span className="save-status" title="Saved in this browser">
              {SAVE_LABELS[saveStatus]}
            </span>
          )}
          {driveStatus && (
            <button
              type="button"
              className={`save-status drive-status${driveStatus === 'reconnect' || driveStatus === 'error' ? ' save-status-error' : ''}`}
              title="Google Drive sync: open its settings"
              onClick={() => setSettings('drive')}
            >
              Drive: {DRIVE_LABELS[driveStatus]}
            </button>
          )}
        </div>
        <div className="header-project">
          {current && (
            <EditableName
              key={current.id}
              className="project-title"
              name={current.name}
              onRename={(name) => renameProject(current.id, name)}
            />
          )}
          <ProjectMenu onProjects={() => setShowProjects(true)} onPrint={() => setPrintOpen(true)} />
          <button
            type="button"
            className="ghost-button settings-button"
            aria-label="Settings"
            title="Settings: boards, look, construction, new parts, units"
            onClick={() => setSettings('last')}
          >
            <svg {...ICON_PROPS}>
              <path
                d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.9.5 1.9 3 0 3.5a1.7 1.7 0 0 0-1 2.5c.9 1.6-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1.1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1.1c-1.5.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1-2.5c-1.9-.5-1.9-3 0-3.5a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0"
              />
            </svg>
          </button>
        </div>
        {saveProblem && <p className="save-status save-status-error">{SAVE_LABELS[saveStatus]}</p>}
      </header>

      <div className="sidebar-body">
        <CollapsibleSection
          id="room"
          title="Room"
          // Shown while folded, so an L or U project says so at a glance.
          badge={layout === 'one' ? undefined : LAYOUT_LABELS[layout]}
        >
          <RoomSettings />
        </CollapsibleSection>
        <CollapsibleSection id="add" title="Add" defaultOpen>
          <ComponentPalette onNewPartSettings={() => setSettings('new-parts')} />
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
        </CollapsibleSection>
      </div>

      <footer className="sidebar-footer">
        <VersionInfo />
      </footer>

      {showProjects && <ProjectsPanel onClose={() => setShowProjects(false)} />}
      {printOpen && <PrintDialog onClose={() => setPrintOpen(false)} />}
      {settings && (
        <SettingsDialog page={settings === 'last' ? undefined : settings} onClose={() => setSettings(null)} />
      )}
    </aside>
  )
}
