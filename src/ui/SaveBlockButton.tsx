import { useState } from 'react'
import { MAX_BLOCK_NAME } from '../lib/blocks'
import { useBlocksStore } from '../store/useBlocksStore'
import { useDesignStore } from '../store/useDesignStore'

/**
 * Saves the selected parts (a whole box, if a panel is selected) as a block
 * with a name, to insert into any project from Add → My blocks.
 */
export function SaveBlockButton() {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const save = () => {
    const parts = useDesignStore.getState().selectionParts()
    if (!parts) return
    setSaved(useBlocksStore.getState().saveBlock(name, parts))
    setNaming(false)
    setName('')
  }

  if (!naming) {
    return (
      <>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            setSaved(null)
            setNaming(true)
          }}
        >
          Save as block…
        </button>
        {saved && (
          <p className="hint">Saved as &ldquo;{saved}&rdquo;. Find it under Add → My blocks.</p>
        )}
      </>
    )
  }

  return (
    <div className="stack">
      <input
        className="board-name"
        type="text"
        aria-label="Block name"
        placeholder="Name, e.g. My drawer unit"
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
      <div className="button-row">
        <button type="button" className="add-button" onClick={save}>
          Save
        </button>
        <button type="button" className="ghost-button" onClick={() => setNaming(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
