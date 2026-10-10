import { create } from 'zustand'

/**
 * Which panels are open on a small screen (a phone or tablet), where the
 * sidebar and the Selected panel slide over the drawing instead of sitting
 * beside it. Not saved anywhere: every visit starts with the drawing.
 * On a wide screen both panels are always shown and this is ignored.
 */
type LayoutState = {
  sidebarOpen: boolean
  /** The Selected panel folded down to its header, to see the part it's about. */
  inspectorFolded: boolean
  setSidebarOpen: (open: boolean) => void
  setInspectorFolded: (folded: boolean) => void
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  sidebarOpen: false,
  inspectorFolded: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setInspectorFolded: (inspectorFolded) => set({ inspectorFolded }),
}))
