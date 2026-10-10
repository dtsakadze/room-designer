import { useEffect, useRef, useState } from 'react'
import { type ProjectData, toProjectData } from '../lib/project'
import { downloadProject, readProjectFile } from '../lib/projectFile'
import { useDesignStore } from '../store/useDesignStore'
import { useProjectsStore } from '../store/useProjectsStore'
import { OpenFileDialog } from './OpenFileDialog'
import { PRINT_SHORTCUT } from './shortcuts'

type ProjectMenuProps = {
  onProjects: () => void
  onPrint: () => void
}

/**
 * The File menu in the sidebar header: the project list, open a JSON file as
 * a project, save this one to a file, or print. It replaced the File section,
 * so the sidebar keeps only what's used while designing.
 */
export function ProjectMenu({ onProjects, onPrint }: ProjectMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const isEmpty = useDesignStore((s) => s.pieces.length === 0)
  const saveStatus = useProjectsStore((s) => s.saveStatus)
  const persistent = useProjectsStore((s) => s.persistent)
  const currentName = useProjectsStore(
    (s) => s.projects.find((project) => project.id === s.currentId)?.name ?? 'this project',
  )
  /** A file that's been read and is waiting for "new project or replace?". */
  const [pending, setPending] = useState<{ fileName: string; design: ProjectData } | null>(null)

  // A click anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (action: () => void) => {
    setOpen(false)
    setMessage(null)
    action()
  }

  const pickFile = () => inputRef.current?.click()

  const save = () => {
    const { projects, currentId } = useProjectsStore.getState()
    const name = projects.find((project) => project.id === currentId)?.name
    downloadProject(toProjectData(useDesignStore.getState(), name))
  }

  const read = async (file: File | undefined) => {
    if (!file) return
    try {
      setPending({ fileName: file.name, design: await readProjectFile(file) })
    } catch (error) {
      setMessage({ text: (error as Error).message, error: true })
    }
  }

  const openAsNew = async () => {
    if (!pending) return
    const { fileName, design } = pending
    setPending(null)
    const name = design.name ?? fileName.replace(/\.json$/i, '')
    await useProjectsStore.getState().createProject({ name, design })
    setMessage({ text: `Opened ${fileName} as a new project.`, error: false })
  }

  const replaceCurrent = () => {
    if (!pending) return
    useDesignStore.getState().replaceDesign(pending.design)
    setMessage({ text: `Replaced "${currentName}" with ${pending.fileName}.`, error: false })
    setPending(null)
  }

  return (
    <>
      <div className="project-menu" ref={ref}>
        <button
          type="button"
          className="ghost-button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          File
          <svg className="menu-chevron" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
        {open && (
          <div className="project-menu-list" role="menu" aria-label="File">
            <button
              type="button"
              role="menuitem"
              // The list can't open while storage is loading or unavailable.
              disabled={saveStatus !== 'saved' && saveStatus !== 'saving'}
              onClick={() => choose(onProjects)}
            >
              Projects…
              <span className="muted">open, new, duplicate</span>
            </button>
            <button type="button" role="menuitem" onClick={() => choose(pickFile)}>
              Open file…
              <span className="muted">.json</span>
            </button>
            <button type="button" role="menuitem" disabled={isEmpty} onClick={() => choose(save)}>
              Save to file
              <span className="muted">backup</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={isEmpty}
              title="Print drawings and the cut list, or save them as a PDF"
              onClick={() => choose(onPrint)}
            >
              Print…
              <kbd>{PRINT_SHORTCUT}</kbd>
            </button>
            {/* Next to Save to file, where it can be acted on, rather than always on screen. */}
            {persistent === false ? (
              <p className="hint hint-error project-menu-note">
                This browser may clear saved projects when disk space runs low. Save to file to
                keep a backup.
              </p>
            ) : (
              <p className="hint project-menu-note">
                Projects are kept in this browser. Save to file now and then for a backup, since
                clearing browsing data deletes them.
              </p>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          void read(event.target.files?.[0])
          // Clear it, so picking the same file again still fires a change.
          event.target.value = ''
        }}
      />
      {message && (
        <p className={message.error ? 'hint hint-error header-message' : 'hint header-message'}>
          <span>{message.text}</span>
          <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setMessage(null)}>
            ×
          </button>
        </p>
      )}
      {pending && (
        <OpenFileDialog
          fileName={pending.fileName}
          currentName={currentName}
          onNewProject={() => void openAsNew()}
          onReplace={replaceCurrent}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )
}
