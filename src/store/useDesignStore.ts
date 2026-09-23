import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Piece, PieceKind } from '../types'
import { contentBounds, normalizePiece } from '../lib/geometry'
import { PLACEMENT_GAP, createPiece } from '../lib/defaults'

type DesignState = {
  pieces: Piece[]
  selectedId: string | null

  addPiece: (kind: PieceKind) => void
  updatePiece: (id: string, patch: Partial<Omit<Piece, 'id' | 'kind'>>) => void
  duplicatePiece: (id: string) => void
  removePiece: (id: string) => void
  select: (id: string | null) => void
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

    addPiece: (kind) =>
      set((state) => {
        const piece = createPiece(kind, nextId())
        // Drop it on the floor to the right of everything else, so a new piece
        // never lands hidden behind one that is already there.
        const bounds = contentBounds(state.pieces)
        if (bounds) piece.x = bounds.maxX + PLACEMENT_GAP
        state.pieces.push(normalizePiece(piece))
        state.selectedId = piece.id
      }),

    updatePiece: (id, patch) =>
      set((state) => {
        const index = state.pieces.findIndex((piece) => piece.id === id)
        if (index === -1) return
        state.pieces[index] = normalizePiece({ ...state.pieces[index], ...patch })
      }),

    duplicatePiece: (id) =>
      set((state) => {
        const source = state.pieces.find((piece) => piece.id === id)
        if (!source) return
        const copy = normalizePiece({
          ...source,
          id: nextId(),
          x: source.x + source.width + PLACEMENT_GAP,
        })
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

    clear: () =>
      set((state) => {
        state.pieces = []
        state.selectedId = null
      }),
  })),
)
