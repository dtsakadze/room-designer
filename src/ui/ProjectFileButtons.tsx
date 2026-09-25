import { useRef, useState } from 'react'
import { type ProjectData, toProjectData } from '../lib/project'
import { downloadProject, readProjectFile } from '../lib/projectFile'
import { useDesignStore } from '../store/useDesignStore'
import { useProjectsStore } from '../store/useProjectsStore'
import { OpenFileDialog } from './OpenFileDialog'

/** Save the open project to a JSON file, or open a file as a new project. */
export function ProjectFileButtons() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const isEmpty = useDesignStore((s) => s.pieces.length === 0)
  const persistent = useProjectsStore((s) => s.persistent)
  const currentName = useProjectsStore(
    (s) => s.projects.find((project) => project.id === s.currentId)?.name ?? 'this project',
  )
  /** A file that's been read and is waiting for "new project or replace?". */
  const [pending, setPending] = useState<{ fileName: string; design: ProjectData } | null>(null)

  const save = () => {
    const { projects, currentId } = useProjectsStore.getState()
    const name = projects.find((project) => project.id === currentId)?.name
    downloadProject(toProjectData(useDesignStore.getState(), name))
    setMessage(null)
  }

  const open = async (file: File | undefined) => {
    if (!file) return
    try {
      const design = await readProjectFile(file)
      setMessage(null)
      setPending({ fileName: file.name, design })
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
    <div className="stack">
      <div className="button-row">
        <button type="button" className="add-button" onClick={() => inputRef.current?.click()}>
          Open file…
        </button>
        <button type="button" className="add-button" onClick={save} disabled={isEmpty}>
          Save to file
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          void open(event.target.files?.[0])
          // Clear it, so picking the same file again still fires a change.
          event.target.value = ''
        }}
      />
      {message && <p className={message.error ? 'hint hint-error' : 'hint'}>{message.text}</p>}
      {pending && (
        <OpenFileDialog
          fileName={pending.fileName}
          currentName={currentName}
          onNewProject={() => void openAsNew()}
          onReplace={replaceCurrent}
          onCancel={() => setPending(null)}
        />
      )}
      {persistent === false ? (
        <p className="hint hint-error">
          This browser may clear saved projects when disk space runs low. Save to file to keep
          a backup.
        </p>
      ) : (
        <p className="hint">
          Projects are kept in this browser. Save to file now and then for a backup, since
          clearing browsing data deletes them.
        </p>
      )}
    </div>
  )
}
