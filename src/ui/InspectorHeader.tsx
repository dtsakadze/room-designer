import { useState } from 'react'
import { MAX_BLOCK_NAME } from '../lib/blocks'
import { useBlocksStore } from '../store/useBlocksStore'
import { useDesignStore } from '../store/useDesignStore'
import { useLayoutStore } from '../store/useLayoutStore'
import { DELETE_SHORTCUT, DUPLICATE_SHORTCUT } from './shortcuts'
import { ICON_PROPS } from './icons'

type InspectorHeaderProps = {
  title: string
  /** Absent with several parts selected, which can't be duplicated as one. */
  onDuplicate?: () => void
  onDelete: () => void
}

/**
 * The top of the Selected panel: what's selected, and what can be done with
 * it as icon buttons. It stays put while the fields below scroll, so the
 * actions are always in reach. Saving as a block asks for a name just below.
 */
export function InspectorHeader({ title, onDuplicate, onDelete }: InspectorHeaderProps) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const folded = useLayoutStore((s) => s.inspectorFolded)
  const setFolded = useLayoutStore((s) => s.setInspectorFolded)

  const save = () => {
    const parts = useDesignStore.getState().selectionParts()
    if (!parts) return
    setSaved(useBlocksStore.getState().saveBlock(name, parts))
    setNaming(false)
    setName('')
  }

  return (
    <header className="inspector-header">
      <div className="inspector-title-row">
        <h2 className="inspector-title">{title}</h2>
        {onDuplicate && (
          <button
            type="button"
            className="inspector-action"
            aria-label="Duplicate"
            title={`Duplicate (${DUPLICATE_SHORTCUT})`}
            onClick={onDuplicate}
          >
            <svg {...ICON_PROPS}>
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="inspector-action"
          aria-label="Save as block"
          aria-expanded={naming}
          title="Save as block, to add to any project from Add → Your blocks"
          onClick={() => {
            setSaved(null)
            setNaming(!naming)
          }}
        >
          <svg {...ICON_PROPS}>
            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
          </svg>
        </button>
        <button
          type="button"
          className="inspector-action inspector-action-danger"
          aria-label="Delete"
          title={`Delete (${DELETE_SHORTCUT})`}
          onClick={onDelete}
        >
          <svg {...ICON_PROPS}>
            <path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v5 M14 11v5" />
          </svg>
        </button>
        {/* On a phone the panel covers the drawing: fold it to the header, or close it. */}
        <button
          type="button"
          className="inspector-action fold-only"
          aria-label={folded ? 'Show the panel' : 'Fold the panel'}
          title={folded ? 'Show the panel' : 'Fold the panel, to see the drawing'}
          onClick={() => setFolded(!folded)}
        >
          <svg {...ICON_PROPS}>
            <path d={folded ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
        <button
          type="button"
          className="inspector-action compact-only"
          aria-label="Done"
          title="Done: deselect and close the panel"
          onClick={() => useDesignStore.getState().select(null)}
        >
          <svg {...ICON_PROPS}>
            <path d="M6 6l12 12 M18 6L6 18" />
          </svg>
        </button>
      </div>
      {naming && (
        <div className="inspector-save-block">
          <input
            className="board-name"
            type="text"
            aria-label="Block name"
            placeholder="Block name, e.g. My drawer unit"
            maxLength={MAX_BLOCK_NAME}
            autoComplete="off"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save()
              if (event.key === 'Escape') setNaming(false)
            }}
          />
          <button type="button" className="add-button" onClick={save}>
            Save
          </button>
        </div>
      )}
      {saved && (
        <p className="hint">
          Saved as &ldquo;{saved}&rdquo;, under Add → Your blocks.{' '}
          <button type="button" className="link-button" onClick={() => setSaved(null)}>
            OK
          </button>
        </p>
      )}
    </header>
  )
}
