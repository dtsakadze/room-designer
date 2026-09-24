import { useState } from 'react'

type EditableNameProps = {
  name: string
  onRename: (name: string) => void
  className?: string
  /** Start in edit mode, e.g. when chosen from a "Rename" button. */
  editing?: boolean
  onDone?: () => void
}

/**
 * A name that turns into a text field on click. Enter or clicking away saves,
 * Escape cancels, and an empty name is ignored.
 */
export function EditableName({ name, onRename, className, editing, onDone }: EditableNameProps) {
  const [draft, setDraft] = useState<string | null>(editing ? name : null)

  const finish = (save: boolean) => {
    if (draft === null) return
    if (save && draft.trim() && draft.trim() !== name) onRename(draft)
    setDraft(null)
    onDone?.()
  }

  if (draft === null) {
    return (
      <button
        type="button"
        className={`editable-name ${className ?? ''}`}
        title="Click to rename"
        onClick={() => setDraft(name)}
      >
        {name}
      </button>
    )
  }

  return (
    <input
      className={`editable-name-input ${className ?? ''}`}
      value={draft}
      aria-label="Project name"
      autoFocus
      onFocus={(event) => event.target.select()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') finish(true)
        if (event.key === 'Escape') finish(false)
      }}
    />
  )
}
