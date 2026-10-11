import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubLocalStorage } from '../test/browser'
import { readPref, writePref } from './prefs'

describe('prefs', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps a preference, and reads null for one never set', () => {
    stubLocalStorage()
    expect(readPref('room-designer:x')).toBeNull()
    writePref('room-designer:x', 'a')
    expect(readPref('room-designer:x')).toBe('a')
  })

  it('reads null and skips writing when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
    expect(readPref('room-designer:x')).toBeNull()
    expect(() => writePref('room-designer:x', 'a')).not.toThrow()
  })
})
