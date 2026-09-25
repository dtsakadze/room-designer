import { useEffect, useState } from 'react'
import { useProjectsStore } from '../store/useProjectsStore'
import { EditableName } from './EditableName'

/** Every project in this browser: open, create, rename and delete. */
export function ProjectsPanel({ onClose }: { onClose: () => void }) {
  const projects = useProjectsStore((s) => s.projects)
  const currentId = useProjectsStore((s) => s.currentId)
  const { createProject, openProject, renameProject, duplicateProject, deleteProject } =
    useProjectsStore.getState()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !renamingId) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, renamingId])

  return (
    <div className="overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="projects-panel" role="dialog" aria-label="Projects">
        <header className="projects-header">
          <h2>Projects</h2>
          <button
            type="button"
            className="add-button"
            onClick={async () => {
              await createProject()
              onClose()
            }}
          >
            New project
          </button>
          <button type="button" className="icon-button" aria-label="Close projects" onClick={onClose}>
            ×
          </button>
        </header>

        <ul className="project-list">
          {projects.map((project) => {
            const isOpen = project.id === currentId
            return (
              <li key={project.id} className={isOpen ? 'project-row project-row-open' : 'project-row'}>
                <div className="project-info">
                  {renamingId === project.id ? (
                    <EditableName
                      name={project.name}
                      editing
                      onRename={(name) => renameProject(project.id, name)}
                      onDone={() => setRenamingId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="project-name"
                      onClick={async () => {
                        await openProject(project.id)
                        onClose()
                      }}
                    >
                      {project.name}
                    </button>
                  )}
                  <span className="muted">
                    {isOpen ? 'Open now · ' : ''}
                    {project.pieceCount} piece{project.pieceCount === 1 ? '' : 's'} · edited{' '}
                    {formatEdited(project.updatedAt)}
                  </span>
                </div>

                {confirmingId === project.id ? (
                  <div className="project-actions">
                    <span className="muted">Delete for good?</span>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        setConfirmingId(null)
                        void deleteProject(project.id)
                      }}
                    >
                      Delete
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="project-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setRenamingId(project.id)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void duplicateProject(project.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setConfirmingId(project.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <p className="hint">Projects are kept in this browser. Save to a file to back one up or move it.</p>
      </div>
    </div>
  )
}

/** "14:05" for today, a date otherwise. */
function formatEdited(iso: string) {
  const date = new Date(iso)
  const today = new Date().toDateString() === date.toDateString()
  return today
    ? `today ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
