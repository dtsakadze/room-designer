import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Piece, PieceKind, Thickness } from '../types'
import { contentBounds, normalizePiece } from '../lib/geometry'
import { DEFAULT_THICKNESS, DEFAULT_UNIT_DEPTH, PLACEMENT_GAP, createPiece } from '../lib/defaults'
import { type ProjectData, clampUnitDepth } from '../lib/project'

/** The part of the state that undo/redo rewinds. Selection isn't in it. */
type Snapshot = { pieces: Piece[]; thickness: Thickness }

/** Oldest steps are dropped past this, so a long session can't grow forever. */
const HISTORY_LIMIT = 200

type DesignState = {
  pieces: Piece[]
  selectedId: string | null
  thickness: Thickness
  /** How deep new parts start. Only affects parts added later, so undo skips it. */
  unitDepth: number

  past: Snapshot[]
  future: Snapshot[]
  /** While a batch is open, all changes undo as one step (see `beginBatch`). */
  batch: { open: boolean; recorded: boolean }

  addPiece: (kind: PieceKind) => void
  updatePiece: (id: string, patch: Partial<Omit<Piece, 'id' | 'kind'>>) => void
  duplicatePiece: (id: string) => void
  removePiece: (id: string) => void
  select: (id: string | null) => void
  setThickness: (patch: Partial<Thickness>) => void
  setUnitDepth: (mm: number) => void
  clear: () => void
  /** Replaces the whole design, e.g. when a project is opened. Starts a fresh history. */
  loadProject: (project: ProjectData) => void

  undo: () => void
  redo: () => void
  /**
   * Group every change until `endBatch` into one undo step: a drag, a resize,
   * or typing a number would otherwise leave one step per pointer move or key.
   */
  beginBatch: () => void
  endBatch: () => void
}

const nextId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const useDesignStore = create<DesignState>()(
  immer((set, get) => {
    /**
     * Saves the design as it is right now onto the undo stack. Call it inside a
     * `set`, before changing anything. `get()` still returns the untouched,
     * frozen state there, so the snapshot costs nothing to take.
     */
    const record = (state: DesignState) => {
      if (state.batch.open) {
        if (state.batch.recorded) return
        state.batch.recorded = true
      }
      const { pieces, thickness } = get()
      state.past.push({ pieces, thickness })
      if (state.past.length > HISTORY_LIMIT) state.past.shift()
      state.future = []
    }

    const restore = (state: DesignState, snapshot: Snapshot) => {
      state.pieces = snapshot.pieces
      state.thickness = snapshot.thickness
      if (!snapshot.pieces.some((piece) => piece.id === state.selectedId)) {
        state.selectedId = null
      }
    }

    return {
      pieces: [],
      selectedId: null,
      thickness: DEFAULT_THICKNESS,
      unitDepth: DEFAULT_UNIT_DEPTH,

      past: [],
      future: [],
      batch: { open: false, recorded: false },

      addPiece: (kind) =>
        set((state) => {
          record(state)
          const piece = createPiece(kind, nextId(), state.thickness, state.unitDepth)
          // Drop it on the floor to the right of everything else, so a new piece
          // never lands hidden behind one that is already there.
          const bounds = contentBounds(state.pieces)
          if (bounds) piece.x = bounds.maxX + PLACEMENT_GAP
          state.pieces.push(normalizePiece(piece, state.thickness))
          state.selectedId = piece.id
        }),

      updatePiece: (id, patch) =>
        set((state) => {
          const index = state.pieces.findIndex((piece) => piece.id === id)
          if (index === -1) return
          const next = normalizePiece({ ...state.pieces[index], ...patch }, state.thickness)
          // A click with no real movement shouldn't leave an empty undo step.
          if (samePiece(state.pieces[index], next)) return
          record(state)
          state.pieces[index] = next
        }),

      duplicatePiece: (id) =>
        set((state) => {
          const source = state.pieces.find((piece) => piece.id === id)
          if (!source) return
          record(state)
          const copy = normalizePiece(
            { ...source, id: nextId(), x: source.x + source.width + PLACEMENT_GAP },
            state.thickness,
          )
          state.pieces.push(copy)
          state.selectedId = copy.id
        }),

      removePiece: (id) =>
        set((state) => {
          if (!state.pieces.some((piece) => piece.id === id)) return
          record(state)
          state.pieces = state.pieces.filter((piece) => piece.id !== id)
          if (state.selectedId === id) state.selectedId = null
        }),

      select: (id) =>
        set((state) => {
          state.selectedId = id
        }),

      setThickness: (patch) =>
        set((state) => {
          const merged = { ...state.thickness, ...patch }
          const next = { body: atLeastOne(merged.body), back: atLeastOne(merged.back) }
          if (next.body === state.thickness.body && next.back === state.thickness.back) return
          record(state)
          state.thickness = next
          state.pieces = state.pieces.map((piece) => normalizePiece(piece, next))
        }),

      setUnitDepth: (mm) =>
        set((state) => {
          state.unitDepth = clampUnitDepth(mm)
        }),

      clear: () =>
        set((state) => {
          if (state.pieces.length === 0) return
          record(state)
          state.pieces = []
          state.selectedId = null
        }),

      loadProject: (project) =>
        set((state) => {
          state.pieces = project.pieces
          state.thickness = project.thickness
          state.unitDepth = project.unitDepth ?? DEFAULT_UNIT_DEPTH
          state.selectedId = null
          state.past = []
          state.future = []
          state.batch = { open: false, recorded: false }
        }),

      undo: () =>
        set((state) => {
          const previous = state.past.pop()
          if (!previous) return
          const { pieces, thickness } = get()
          state.future.push({ pieces, thickness })
          restore(state, previous)
        }),

      redo: () =>
        set((state) => {
          const next = state.future.pop()
          if (!next) return
          const { pieces, thickness } = get()
          state.past.push({ pieces, thickness })
          restore(state, next)
        }),

      beginBatch: () =>
        set((state) => {
          state.batch = { open: true, recorded: false }
        }),

      endBatch: () =>
        set((state) => {
          state.batch = { open: false, recorded: false }
        }),
    }
  }),
)

const atLeastOne = (mm: number) => Math.max(1, Math.round(mm) || 1)

const samePiece = (a: Piece, b: Piece) =>
  a.x === b.x &&
  a.y === b.y &&
  a.width === b.width &&
  a.height === b.height &&
  a.depth === b.depth &&
  !!a.fixed === !!b.fixed &&
  a.railAt === b.railAt
