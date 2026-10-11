import type { Box, Piece, Thickness } from '../types'
import { freeName } from './names'
import { type ProjectData, readProject, toProjectData } from './project'

const KEY = 'room-designer:blocks'
export const MAX_BLOCK_NAME = 40

/**
 * A block as it's kept: a name and a design saved like a project (so opening
 * it goes through the same checks and format upgrades as opening a file). The
 * design stays as it was stored until it's read, so a block saved by a newer
 * version of the app is kept as it is, never rewritten.
 */
export type StoredBlock = { id: string; name: string; savedAt: string; design: unknown }

/** A stored block, read: its design, or why it can't be used. */
export type Block = {
  id: string
  name: string
  design: ProjectData | null
  problem: 'newer' | 'invalid' | null
  pieceCount: number
}

export const cleanBlockName = (name: unknown) =>
  typeof name === 'string' ? name.trim().slice(0, MAX_BLOCK_NAME) : ''

/** "My unit", then "My unit 2", 3, … skipping names in use. */
export const blockName = (name: string, taken: string[]) => freeName(cleanBlockName(name) || 'My block', taken)

/** Every saved block, newest first; nothing when storage is blocked or holds something else. */
export function loadBlocks(): StoredBlock[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (block): block is StoredBlock =>
        typeof block?.id === 'string' && typeof block.name === 'string' && 'design' in block,
    )
  } catch {
    return []
  }
}

/** Keeps the blocks; false when storage is full or blocked, so they only last this visit. */
export function storeBlocks(blocks: StoredBlock[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(blocks))
    return true
  } catch {
    return false
  }
}

/** A new block from parts of a design, as `useDesignStore.selectionParts` gives them. */
export function newBlock(
  name: string,
  parts: { pieces: Piece[]; boxes: Box[]; thickness: Thickness },
  taken: string[],
  id: string,
): StoredBlock {
  return {
    id,
    name: blockName(name, taken),
    savedAt: new Date().toISOString(),
    design: toProjectData(parts),
  }
}

export function readBlock(block: StoredBlock): Block {
  const result = readProject(block.design)
  return {
    id: block.id,
    name: block.name,
    design: result.ok ? result.project : null,
    problem: result.ok ? null : result.problem,
    pieceCount: result.ok ? result.project.pieces.length : 0,
  }
}

/** Calls back when another tab changes the blocks, so the list can update. */
export function onBlocksChange(callback: () => void) {
  const listener = (event: StorageEvent) => {
    if (event.key === KEY) callback()
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
