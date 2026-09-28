import { afterEach, describe, expect, it, vi } from 'vitest'

const keys = (metaKey: boolean, ctrlKey: boolean) => ({ metaKey, ctrlKey })

async function onPlatform(platform: string) {
  vi.resetModules()
  vi.stubGlobal('navigator', { platform })
  return import('./shortcuts')
}

describe('shortcuts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses ⌘ on a Mac', async () => {
    const { hasModifier, UNDO_SHORTCUT } = await onPlatform('MacIntel')
    expect(hasModifier(keys(true, false))).toBe(true)
    expect(hasModifier(keys(false, true))).toBe(false)
    expect(UNDO_SHORTCUT).toBe('⌘Z')
  })

  it('uses Ctrl elsewhere', async () => {
    const { hasModifier, UNDO_SHORTCUT } = await onPlatform('Win32')
    expect(hasModifier(keys(false, true))).toBe(true)
    expect(hasModifier(keys(true, false))).toBe(false)
    expect(UNDO_SHORTCUT).toBe('Ctrl+Z')
  })
})
