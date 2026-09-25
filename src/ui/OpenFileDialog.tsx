import { useEffect } from 'react'
import { UNDO_SHORTCUT } from './shortcuts'

type OpenFileDialogProps = {
  fileName: string
  currentName: string
  onNewProject: () => void
  onReplace: () => void
  onCancel: () => void
}

/**
 * Asks what to do with an opened file: open it as a new project (safe, the
 * default), or overwrite the open project with it.
 */
export function OpenFileDialog({
  fileName,
  currentName,
  onNewProject,
  onReplace,
  onCancel,
}: OpenFileDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div
      className="overlay"
      onPointerDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div
        className="projects-panel open-file-dialog"
        role="dialog"
        aria-label={`Open ${fileName}`}
      >
        <h2>Open {fileName}</h2>
        <p className="muted">How do you want to open it?</p>

        <button
          type="button"
          className="add-button choice-button"
          autoFocus
          onClick={onNewProject}
        >
          <strong>Open as a new project</strong>
          <span className="muted">"{currentName}" stays as it is.</span>
        </button>

        <button type="button" className="add-button choice-button" onClick={onReplace}>
          <strong>Replace "{currentName}"</strong>
          <span className="hint hint-error">
            Overwrites this project's design with the file. You can undo it with {UNDO_SHORTCUT}.
          </span>
        </button>

        <button type="button" className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
