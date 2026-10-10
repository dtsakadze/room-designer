import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLocalStorage } from '../test/browser'
import { DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'
import { FORMAT_VERSION } from './project'
import type { Piece } from '../types'

const shelf = (id: string, x: number): Piece =>
  normalizePiece({ id, kind: 'shelf', x, y: 100, width: 500, height: 18, depth: 400 }, DEFAULT_THICKNESS)
const parts = (n = 2) => ({
  pieces: Array.from({ length: n }, (_, i) => shelf(`s${i}`, i * 600)),
  boxes: [],
  thickness: DEFAULT_THICKNESS,
})

describe('blocks', () => {
  let stored: Map<string, string>
  beforeEach(() => {
    vi.resetModules()
    stored = stubLocalStorage()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('are saved newest first, under a name that is numbered when taken, and kept for the next visit', async () => {
    const first = await import('./../store/useBlocksStore')
    const store = first.useBlocksStore
    expect(store.getState().saveBlock('My unit', parts())).toBe('My unit')
    expect(store.getState().saveBlock('  My unit  ', parts(1))).toBe('My unit 2')
    expect(store.getState().saveBlock('', parts(1))).toBe('My block')
    expect(store.getState().blocks.map((b) => b.name)).toEqual(['My block', 'My unit 2', 'My unit'])
    vi.resetModules()
    const next = await import('./../store/useBlocksStore')
    expect(next.useBlocksStore.getState().blocks.map((b) => b.name)).toEqual(['My block', 'My unit 2', 'My unit'])
  })

  it('keep their design in the current format, and read back with every part', async () => {
    const { useBlocksStore } = await import('./../store/useBlocksStore')
    const { readBlock } = await import('./blocks')
    useBlocksStore.getState().saveBlock('Two shelves', parts(2))
    const [block] = useBlocksStore.getState().blocks
    expect((block.design as { formatVersion: number }).formatVersion).toBe(FORMAT_VERSION)
    expect(readBlock(block)).toMatchObject({ name: 'Two shelves', problem: null, pieceCount: 2 })
  })

  it('are renamed (not to nothing) and deleted', async () => {
    const { useBlocksStore } = await import('./../store/useBlocksStore')
    const store = useBlocksStore.getState()
    store.saveBlock('A', parts())
    store.saveBlock('B', parts())
    const [b, a] = useBlocksStore.getState().blocks
    store.renameBlock(a.id, '   ')
    store.renameBlock(a.id, 'B')
    expect(useBlocksStore.getState().blocks.map((x) => x.name)).toEqual(['B', 'B 2'])
    store.deleteBlock(b.id)
    expect(useBlocksStore.getState().blocks.map((x) => x.name)).toEqual(['B 2'])
  })

  it('keep a block from a newer version as it is, and say it can’t be opened', async () => {
    const newer = { id: 'n', name: 'From the future', savedAt: '2030-01-01', design: { formatVersion: FORMAT_VERSION + 1, pieces: [] } }
    stored.set('room-designer:blocks', JSON.stringify([newer]))
    const { useBlocksStore } = await import('./../store/useBlocksStore')
    const { readBlock } = await import('./blocks')
    expect(readBlock(useBlocksStore.getState().blocks[0])).toMatchObject({ problem: 'newer', design: null })
    // Saving another leaves it untouched.
    useBlocksStore.getState().saveBlock('Mine', parts())
    expect(JSON.parse(stored.get('room-designer:blocks')!).at(-1)).toEqual(newer)
  })

  it('start empty when storage holds something else, and still work when it is blocked', async () => {
    stored.set('room-designer:blocks', '{"not":"a list"}')
    const { useBlocksStore } = await import('./../store/useBlocksStore')
    expect(useBlocksStore.getState().blocks).toEqual([])
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(useBlocksStore.getState().saveBlock('Still here', parts())).toBe('Still here')
    expect(useBlocksStore.getState().blocks).toHaveLength(1)
  })
})
