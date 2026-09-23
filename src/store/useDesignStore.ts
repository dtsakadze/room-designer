import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Cabinet, Part, PartKind } from '../types'
import { clampPart } from '../lib/geometry'
import { createPart, defaultCabinet } from '../lib/defaults'

type DesignState = {
  cabinet: Cabinet
  selectedId: string | null
  /** Off while a part is being dragged, so OrbitControls stays out of the way. */
  orbitEnabled: boolean

  setCabinet: (patch: Partial<Omit<Cabinet, 'id' | 'parts'>>) => void
  addPart: (kind: PartKind) => void
  updatePart: (id: string, patch: Partial<Omit<Part, 'id' | 'kind'>>) => void
  removePart: (id: string) => void
  select: (id: string | null) => void
  setOrbitEnabled: (enabled: boolean) => void
  reset: () => void
}

const nextId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const useDesignStore = create<DesignState>()(
  immer((set) => ({
    cabinet: defaultCabinet(),
    selectedId: null,
    orbitEnabled: true,

    setCabinet: (patch) =>
      set((state) => {
        Object.assign(state.cabinet, patch)
        // Resizing the carcass can strand parts outside the cavity.
        state.cabinet.parts = state.cabinet.parts.map((part) =>
          clampPart(part, state.cabinet),
        )
      }),

    addPart: (kind) =>
      set((state) => {
        const part = clampPart(createPart(kind, state.cabinet, nextId()), state.cabinet)
        state.cabinet.parts.push(part)
        state.selectedId = part.id
      }),

    updatePart: (id, patch) =>
      set((state) => {
        const index = state.cabinet.parts.findIndex((part) => part.id === id)
        if (index === -1) return
        const merged = { ...state.cabinet.parts[index], ...patch }
        state.cabinet.parts[index] = clampPart(merged, state.cabinet)
      }),

    removePart: (id) =>
      set((state) => {
        state.cabinet.parts = state.cabinet.parts.filter((part) => part.id !== id)
        if (state.selectedId === id) state.selectedId = null
      }),

    select: (id) =>
      set((state) => {
        state.selectedId = id
      }),

    setOrbitEnabled: (enabled) =>
      set((state) => {
        state.orbitEnabled = enabled
      }),

    reset: () =>
      set((state) => {
        state.cabinet = defaultCabinet()
        state.selectedId = null
      }),
  })),
)
