import { create } from 'zustand'

/**
 * Which panels are open: on a small screen (a phone or tablet), where the
 * sidebar and the Selected panel slide over the drawing instead of sitting
 * beside it (on a wide screen both are always shown and those are ignored),
 * and the print dialog, which opens from the File menu, the cut list and ⌘P.
 * Not saved anywhere: every visit starts with the drawing.
 */
type LayoutState = {
  sidebarOpen: boolean
  /** The Selected panel folded down to its header, to see the part it's about. */
  inspectorFolded: boolean
  printOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setInspectorFolded: (folded: boolean) => void
  setPrintOpen: (open: boolean) => void
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  sidebarOpen: false,
  inspectorFolded: false,
  printOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setInspectorFolded: (inspectorFolded) => set({ inspectorFolded }),
  setPrintOpen: (printOpen) => set({ printOpen }),
}))
