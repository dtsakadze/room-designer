import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Piece, PieceKind, Thickness } from '../types'
import { contentBounds, normalizePiece } from '../lib/geometry'
import { DEFAULT_THICKNESS, PLACEMENT_GAP, createPiece } from '../lib/defaults'

type DesignState = {
  pieces: Piece[]
  selectedId: string | null
  thickness: Thickness

  addPiece: (kind: PieceKind) => void
  updatePiece: (id: string, patch: Partial<Omit<Piece, 'id' | 'kind'>>) => void
  duplicatePiece: (id: string) => void
  removePiece: (id: string) => void
  select: (id: string | null) => void
  setThickness: (patch: Partial<Thickness>) => void
  clear: () => void
}

const nextId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const useDesignStore = create<DesignState>()(
  immer((set) => ({
    pieces: [],
    selectedId: null,
    thickness: DEFAULT_THICKNESS,

    addPiece: (kind) =>
      set((state) => {
        const piece = createPiece(kind, nextId(), state.thickness)
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
        state.pieces[index] = normalizePiece({ ...state.pieces[index], ...patch }, state.thickness)
      }),

    duplicatePiece: (id) =>
      set((state) => {
        const source = state.pieces.find((piece) => piece.id === id)
        if (!source) return
        const copy = normalizePiece(
          { ...source, id: nextId(), x: source.x + source.width + PLACEMENT_GAP },
          state.thickness,
        )
        state.pieces.push(copy)
        state.selectedId = copy.id
      }),

    removePiece: (id) =>
      set((state) => {
        state.pieces = state.pieces.filter((piece) => piece.id !== id)
        if (state.selectedId === id) state.selectedId = null
      }),

    select: (id) =>
      set((state) => {
        state.selectedId = id
      }),

    setThickness: (patch) =>
      set((state) => {
        const next = { ...state.thickness, ...patch }
        state.thickness = { body: atLeastOne(next.body), back: atLeastOne(next.back) }
        state.pieces = state.pieces.map((piece) => normalizePiece(piece, state.thickness))
      }),

    clear: () =>
      set((state) => {
        state.pieces = []
        state.selectedId = null
      }),
  })),
)

const atLeastOne = (mm: number) => Math.max(1, Math.round(mm) || 1)
