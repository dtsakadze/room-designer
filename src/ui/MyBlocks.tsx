import { useMemo, useState } from 'react'
import { readBlock } from '../lib/blocks'
import { useBlocksStore } from '../store/useBlocksStore'
import { useDesignStore } from '../store/useDesignStore'
import { EditableName } from './EditableName'

/**
 * The blocks the person saved, to insert into this project. Inserting puts a
 * block on the wall being edited, to the right of what's there. Shown only
 * once there is one.
 */
export function MyBlocks() {
  const stored = useBlocksStore((s) => s.blocks)
  const { renameBlock, deleteBlock } = useBlocksStore.getState()
  const insertBlock = useDesignStore((s) => s.insertBlock)
  const blocks = useMemo(() => stored.map(readBlock), [stored])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  if (blocks.length === 0) return null

  return (
    <section className="section">
      <h2>My blocks</h2>
      <div className="stack">
        {blocks.map((block) => (
          <div key={block.id} className="block">
            {renamingId === block.id ? (
              <EditableName
                name={block.name}
                editing
                onRename={(name) => renameBlock(block.id, name)}
                onDone={() => setRenamingId(null)}
              />
            ) : (
              <button
                type="button"
                className="add-button block-insert"
                disabled={!block.design}
                title="Insert into this project"
                onClick={() => block.design && insertBlock(block.design)}
              >
                {block.name}
                <span className="muted">
                  {block.problem === 'newer'
                    ? "can't open: saved by a newer version"
                    : block.problem
                      ? "can't open: damaged"
                      : `${block.pieceCount} part${block.pieceCount === 1 ? '' : 's'}`}
                </span>
              </button>
            )}
            {confirmingId === block.id ? (
              <div className="button-row">
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setConfirmingId(null)
                    deleteBlock(block.id)
                  }}
                >
                  Delete for good
                </button>
                <button type="button" className="ghost-button" onClick={() => setConfirmingId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="block-actions">
                {block.design && (
                  <button type="button" className="ghost-button" onClick={() => setRenamingId(block.id)}>
                    Rename
                  </button>
                )}
                <button type="button" className="ghost-button" onClick={() => setConfirmingId(block.id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        <p className="hint">Saved in this browser, for every project. Select parts and use Save as block.</p>
      </div>
    </section>
  )
}
