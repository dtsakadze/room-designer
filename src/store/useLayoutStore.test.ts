import { beforeEach, describe, expect, it } from 'vitest'
import { useLayoutStore } from './useLayoutStore'

describe('useLayoutStore', () => {
  beforeEach(() => useLayoutStore.setState({ sidebarOpen: false, inspectorFolded: false }))

  it('starts with the drawing: sidebar closed, Selected panel unfolded', () => {
    expect(useLayoutStore.getState().sidebarOpen).toBe(false)
    expect(useLayoutStore.getState().inspectorFolded).toBe(false)
  })

  it('opens and closes the sidebar and folds the Selected panel', () => {
    useLayoutStore.getState().setSidebarOpen(true)
    useLayoutStore.getState().setInspectorFolded(true)
    expect(useLayoutStore.getState()).toMatchObject({ sidebarOpen: true, inspectorFolded: true })
    useLayoutStore.getState().setSidebarOpen(false)
    expect(useLayoutStore.getState().sidebarOpen).toBe(false)
  })
})
