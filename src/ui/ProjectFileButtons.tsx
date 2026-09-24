import { useRef, useState } from 'react'
import { toProjectData } from '../lib/project'
import { downloadProject, readProjectFile } from '../lib/projectFile'
import { useDesignStore } from '../store/useDesignStore'
import { useProjectsStore } from '../store/useProjectsStore'

/** Save the open project to a JSON file, or open a file as a new project. */
export function ProjectFileButtons() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const isEmpty = useDesignStore((s) => s.pieces.length === 0)

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
      const name = design.name ?? file.name.replace(/\.json$/i, '')
      await useProjectsStore.getState().createProject({ name, design })
      setMessage({ text: `Opened ${file.name} as a new project.`, error: false })
    } catch (error) {
      setMessage({ text: (error as Error).message, error: true })
    }
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
    </div>
  )
}
