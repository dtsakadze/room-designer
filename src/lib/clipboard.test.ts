import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLocalStorage } from '../test/browser'
import { DEFAULT_THICKNESS } from './defaults'

const shelf = { id: 's', kind: 'shelf' as const, x: 0, y: 400, width: 500, height: 18, depth: 400 }

describe('clipboard', () => {
  let stored: Map<string, string>
  beforeEach(() => {
    vi.resetModules()
    stored = stubLocalStorage()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('is empty until something is copied', async () => {
    const { readClipboard } = await import('./clipboard')
    expect(readClipboard()).toBeNull()
  })

  it('keeps what was copied, in storage too, as a project save', async () => {
    const { readClipboard, writeClipboard } = await import('./clipboard')
    writeClipboard({ pieces: [shelf], boxes: [], thickness: DEFAULT_THICKNESS })
    expect(readClipboard()?.pieces).toEqual([shelf])
    expect(JSON.parse(stored.get('room-designer:clipboard')!).formatVersion).toBeGreaterThan(0)
  })

  it('reads what another tab copied', async () => {
    const { readClipboard, writeClipboard } = await import('./clipboard')
    writeClipboard({ pieces: [shelf], boxes: [], thickness: DEFAULT_THICKNESS })
    const other = JSON.parse(stored.get('room-designer:clipboard')!)
    other.pieces[0].id = 'from-other-tab'
    stored.set('room-designer:clipboard', JSON.stringify(other))
    expect(readClipboard()?.pieces[0].id).toBe('from-other-tab')
  })

  it('still works in this tab when storage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const { readClipboard, writeClipboard } = await import('./clipboard')
    writeClipboard({ pieces: [shelf], boxes: [], thickness: DEFAULT_THICKNESS })
    expect(readClipboard()?.pieces).toEqual([shelf])
  })

  it('ignores something unreadable in storage', async () => {
    stored.set('room-designer:clipboard', '{not json')
    const { readClipboard } = await import('./clipboard')
    expect(readClipboard()).toBeNull()
  })
})
