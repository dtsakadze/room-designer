import { beforeEach, describe, expect, it } from 'vitest'
import { closeSidebar, useLayoutStore } from './useLayoutStore'

describe('useLayoutStore', () => {
  beforeEach(() => useLayoutStore.setState({ sidebarOpen: false, inspectorFolded: false, printOpen: false }))

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

  it('puts the sidebar away with closeSidebar', () => {
    useLayoutStore.getState().setSidebarOpen(true)
    closeSidebar()
    expect(useLayoutStore.getState().sidebarOpen).toBe(false)
  })

  it('opens and closes the print dialog, closed to start', () => {
    expect(useLayoutStore.getState().printOpen).toBe(false)
    useLayoutStore.getState().setPrintOpen(true)
    expect(useLayoutStore.getState().printOpen).toBe(true)
    useLayoutStore.getState().setPrintOpen(false)
    expect(useLayoutStore.getState().printOpen).toBe(false)
  })
})
