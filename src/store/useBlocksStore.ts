import { create } from 'zustand'
import {
  type StoredBlock,
  blockName,
  cleanBlockName,
  loadBlocks,
  newBlock,
  onBlocksChange,
  storeBlocks,
} from '../lib/blocks'
import { newId } from '../lib/ids'
import type { Box, Piece, Thickness } from '../types'

/**
 * The person's own reusable blocks: parts they saved to insert into any
 * project. Kept in this browser (localStorage), not in a project, so every
 * project can use them. Newest first.
 */
type BlocksState = {
  blocks: StoredBlock[]
  /** Saves parts under a name, numbered if taken; returns the name used. */
  saveBlock: (name: string, parts: { pieces: Piece[]; boxes: Box[]; thickness: Thickness }) => string
  renameBlock: (id: string, name: string) => void
  deleteBlock: (id: string) => void
  /** Re-reads the blocks, after another tab changed them. */
  refresh: () => void
}

export const useBlocksStore = create<BlocksState>()((set, get) => {
  const keep = (blocks: StoredBlock[]) => {
    storeBlocks(blocks)
    set({ blocks })
  }
  return {
    blocks: loadBlocks(),
    saveBlock: (name, parts) => {
      const block = newBlock(name, parts, get().blocks.map((b) => b.name), newId())
      keep([block, ...get().blocks])
      return block.name
    },
    renameBlock: (id, name) => {
      const clean = cleanBlockName(name)
      const current = get().blocks.find((block) => block.id === id)
      if (!clean || !current || clean === current.name) return
      const others = get().blocks.filter((block) => block.id !== id).map((block) => block.name)
      keep(get().blocks.map((block) => (block.id === id ? { ...block, name: blockName(clean, others) } : block)))
    },
    deleteBlock: (id) => keep(get().blocks.filter((block) => block.id !== id)),
    refresh: () => set({ blocks: loadBlocks() }),
  }
})

// Another tab saving or deleting a block shows up here.
if (typeof window !== 'undefined') onBlocksChange(() => useBlocksStore.getState().refresh())
