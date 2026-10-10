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

  it('starts with the two standard hanging guides, shown', async () => {
    const { useSettingsStore } = await import('./useSettingsStore')
    const state = useSettingsStore.getState()
    expect(state.showHangingGuides).toBe(true)
    expect(state.hangingGuides.map((g) => g.length)).toEqual([1000, 1700])
  })

  it('remembers hanging guide heights and whether they show', async () => {
    const first = await import('./useSettingsStore')
    first.useSettingsStore.getState().setHangingGuides([{ label: 'Dresses', length: 1400 }])
    first.useSettingsStore.getState().setShowHangingGuides(false)
    vi.resetModules()
    const next = await import('./useSettingsStore')
    expect(next.useSettingsStore.getState()).toMatchObject({
      showHangingGuides: false,
      hangingGuides: [{ label: 'Dresses', length: 1400 }],
    })
  })

  it('falls back to the standard guides when the stored ones are broken', async () => {
    stored.set('room-designer:hanging-guides', JSON.stringify([{ label: 'x', length: 'tall' }]))
    const { useSettingsStore } = await import('./useSettingsStore')
    expect(useSettingsStore.getState().hangingGuides.map((g) => g.length)).toEqual([1000, 1700])
  })

  it('remembers whether the cut list is by wall, off to start', async () => {
    const first = await import('./useSettingsStore')
    expect(first.useSettingsStore.getState().cutListByWall).toBe(false)
    first.useSettingsStore.getState().setCutListByWall(true)
    vi.resetModules()
    const next = await import('./useSettingsStore')
    expect(next.useSettingsStore.getState().cutListByWall).toBe(true)
    expect(stored.get('room-designer:cut-list-by-wall')).toBe('true')
  })
})
