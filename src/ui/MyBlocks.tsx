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
  const [managingId, setManagingId] = useState<string | null>(null)

  if (blocks.length === 0) return null

  return (
    <section className="add-group">
      <h2>Your blocks</h2>
      <ul className="block-list">
        {blocks.map((block) => (
          <li key={block.id} className="block">
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
                <span className="block-name">{block.name}</span>
                <span className="muted">
                  {block.problem === 'newer'
                    ? "can't open: saved by a newer version"
                    : block.problem
                      ? "can't open: damaged"
                      : `${block.pieceCount} part${block.pieceCount === 1 ? '' : 's'}`}
                </span>
              </button>
            )}
            {/* Rename and Delete stay out of sight until asked for, so the list reads as add buttons. */}
            <button
              type="button"
              className="icon-button block-more"
              aria-label={`More for ${block.name}`}
              aria-expanded={managingId === block.id}
              onClick={() => {
                setManagingId(managingId === block.id ? null : block.id)
                setConfirmingId(null)
              }}
            >
              ⋯
            </button>
            {managingId === block.id &&
              (confirmingId === block.id ? (
                <div className="button-row block-actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      setConfirmingId(null)
                      setManagingId(null)
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
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setRenamingId(block.id)
                        setManagingId(null)
                      }}
                    >
                      Rename
                    </button>
                  )}
                  <button type="button" className="ghost-button" onClick={() => setConfirmingId(block.id)}>
                    Delete
                  </button>
                  <span className="hint">Saved in this browser, for every project.</span>
                </div>
              ))}
          </li>
        ))}
      </ul>
    </section>
  )
}
