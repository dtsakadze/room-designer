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

  it('leaves keys pressed in text fields, text areas and dropdowns to them', async () => {
    const { isFieldTarget } = await onPlatform('MacIntel')
    expect(['INPUT', 'TEXTAREA', 'SELECT'].every((tagName) => isFieldTarget({ tagName } as unknown as EventTarget))).toBe(true)
    expect(isFieldTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true)
    expect(isFieldTarget({ tagName: 'BUTTON', isContentEditable: false } as unknown as EventTarget)).toBe(false)
    expect(isFieldTarget(null)).toBe(false)
  })

  it('sees dialogs, full views and menus over the drawing, but not the Shortcuts panel', async () => {
    const { isOverlayOpen } = await onPlatform('MacIntel')
    const queries: string[] = []
    vi.stubGlobal('document', {
      querySelector: (query: string) => (queries.push(query), query.includes('menu') ? {} : null),
    })
    expect(isOverlayOpen()).toBe(true)
    expect(queries[0]).toContain(':not(.shortcuts-panel)')
  })
})
