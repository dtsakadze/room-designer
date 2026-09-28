import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLocalStorage } from '../test/browser'

describe('settings', () => {
  let stored: Map<string, string>
  beforeEach(() => {
    vi.resetModules()
    stored = stubLocalStorage()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('starts in millimetres with doors shown', async () => {
    const { useSettingsStore } = await import('./useSettingsStore')
    expect(useSettingsStore.getState()).toMatchObject({ unit: 'mm', showDoors: true })
  })

  it('remembers the unit and hidden doors for the next visit', async () => {
    const first = await import('./useSettingsStore')
    first.useSettingsStore.getState().setUnit('cm')
    first.useSettingsStore.getState().setShowDoors(false)
    vi.resetModules()
    const next = await import('./useSettingsStore')
    expect(next.useSettingsStore.getState()).toMatchObject({ unit: 'cm', showDoors: false })
    expect(stored.get('room-designer:unit')).toBe('cm')
  })

  it('ignores a stored unit it doesn’t know', async () => {
    stored.set('room-designer:unit', 'furlong')
    const { useSettingsStore } = await import('./useSettingsStore')
    expect(useSettingsStore.getState().unit).toBe('mm')
  })
})
