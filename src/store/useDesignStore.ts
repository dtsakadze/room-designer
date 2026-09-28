import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Box, Piece, PieceKind, Room, Thickness, Wall } from '../types'
import { contentBounds, normalizePiece } from '../lib/geometry'
import { DEFAULT_THICKNESS, DEFAULT_UNIT_DEPTH, PLACEMENT_GAP, createPiece } from '../lib/defaults'
import { type ProjectData, clampUnitDepth } from '../lib/project'
import { BOX_HEIGHT, BOX_WIDTH, normalizeBox, rebuildBox, withBoxPanels } from '../lib/box'
import { readClipboard, writeClipboard } from '../lib/clipboard'
import { DEFAULT_ROOM, activeWalls, clampRoomSize, wallOf } from '../lib/room'

/** The part of the state that undo/redo rewinds. Selection isn't in it. */
type Snapshot = { pieces: Piece[]; boxes: Box[]; thickness: Thickness; room: Room }

/** Oldest steps are dropped past this, so a long session can't grow forever. */
const HISTORY_LIMIT = 200

type DesignState = {
  pieces: Piece[]
  /** Carcasses whose panels (tagged with `boxId`) live in `pieces`. */
  boxes: Box[]
  /** The part the inspector shows, and the last one clicked. */
  selectedId: string | null
  /** Every selected part (the primary one included); more than one for a multi-selection. */
  selectedIds: string[]
  thickness: Thickness
  /**
   * Colour new parts start with; null means the standard look. Like `unitDepth`,
   * it only affects parts added later, so undo skips it.
   */
  defaultColor: string | null
  /** How deep new parts start. Only affects parts added later, so undo skips it. */
  unitDepth: number
  /** Which walls have units on them, and the room's size. */
  room: Room
  /**
   * The wall being edited: the canvas shows its unit, and new parts go on it.
   * Like the selection, it isn't saved or undone.
   */
  activeWall: Wall

  past: Snapshot[]
  future: Snapshot[]
  /** While a batch is open, all changes undo as one step (see `beginBatch`). */
  batch: { open: boolean; recorded: boolean }

  addPiece: (kind: PieceKind) => void
  addBox: () => void
  /** Resizes, moves or changes a box; its panels are rebuilt to match. */
  updateBox: (id: string, patch: Partial<Omit<Box, 'id'>>) => void
  /** Turns a box's panels into ordinary pieces that can be edited one by one. */
  separateBox: (id: string) => void
  /**
   * On a box's panel, only a move applies, and it moves the whole box; the
   * same goes for `duplicatePiece` and `removePiece`.
   */
  updatePiece: (id: string, patch: Partial<Omit<Piece, 'id' | 'kind'>>) => void
  /**
   * Moves several parts together by the same distance, as one undo step; a
   * box's panel moves its whole box. Only parts on the wall being edited move,
   * and never below the floor: the lowest one stops there and the rest keep
   * their places relative to it.
   */
  movePieces: (ids: string[], dx: number, dy: number) => void
  duplicatePiece: (id: string) => void
  removePiece: (id: string) => void
  select: (id: string | null) => void
  /** Adds a part to the selection, or takes it out if it's already in (⌘-click). */
  toggleSelect: (id: string) => void
  /** Selects these parts (e.g. from a selection rectangle), or adds them to the selection. */
  selectMany: (ids: string[], add?: boolean) => void
  /** Something has been copied (here or in another tab), so paste can work. */
  canPaste: boolean
  /** Copies the selected parts (whole boxes, if any panel of one is selected). */
  copySelection: () => void
  /**
   * Pastes the copied parts, from this project or another, to the right of
   * everything here, as one undo step, and selects them. They take this
   * project's board thickness.
   */
  paste: () => void
  /** Re-checks for copied parts, e.g. after another tab copied something. */
  refreshClipboard: () => void
  /** Deletes several parts at once, as one undo step. */
  removePieces: (ids: string[]) => void
  /** Gives parts their own colour, or null to go back to the standard look. */
  setPieceColors: (ids: string[], color: string | null) => void
  setDefaultColor: (color: string | null) => void
  setThickness: (patch: Partial<Thickness>) => void
  setUnitDepth: (mm: number) => void
  /** Changes the room; a wall switched off takes its parts with it. */
  setRoom: (patch: Partial<Room>) => void
  /** Switches the wall being edited, leaving behind a selection on the old one. */
  setActiveWall: (wall: Wall) => void
  clear: () => void
  /** Replaces the whole design, e.g. when a project is opened. Starts a fresh history. */
  loadProject: (project: ProjectData) => void
  /**
   * Overwrites the open project's design with another (e.g. an opened file),
   * as one undoable step. The file's unit depth and new-part colour come along;
   * like any change to those settings, undo doesn't restore them.
   */
  replaceDesign: (project: ProjectData) => void

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
      state.past.push(snapshot())
      if (state.past.length > HISTORY_LIMIT) state.past.shift()
      state.future = []
    }

    const snapshot = (): Snapshot => {
      const { pieces, boxes, thickness, room } = get()
      return { pieces, boxes, thickness, room }
    }

    const restore = (state: DesignState, snapshot: Snapshot) => {
      state.pieces = snapshot.pieces
      state.boxes = snapshot.boxes
      state.thickness = snapshot.thickness
      state.room = snapshot.room
      const ids = new Set(snapshot.pieces.map((piece) => piece.id))
      state.selectedIds = state.selectedIds.filter((id) => ids.has(id))
      if (state.selectedId && !ids.has(state.selectedId)) {
        state.selectedId = state.selectedIds.at(-1) ?? null
      }
      keepActiveWall(state)
    }

    /** Falls back to the back wall when the one being edited is switched off. */
    const keepActiveWall = (state: DesignState) => {
      if (!activeWalls(state.room).includes(state.activeWall)) state.activeWall = 'back'
    }

    /** The wall a selection is on, so selecting a part brings you to its wall. */
    const followSelection = (state: DesignState) => {
      const piece = state.pieces.find((candidate) => candidate.id === state.selectedId)
      if (piece) state.activeWall = wallOf(piece)
    }

    /** Where new parts on the wall being edited go: right of everything already on it. */
    const wallBounds = (state: DesignState) =>
      contentBounds(state.pieces.filter((piece) => wallOf(piece) === state.activeWall))

    /** How a part or box is stored on the wall being edited: no value for the back wall. */
    const onActiveWall = (state: DesignState) =>
      state.activeWall === 'back' ? {} : { wall: state.activeWall }

    /** Applies a change to a box and rebuilds its panels, if anything changed. */
    const changeBox = (state: DesignState, id: string, patch: Partial<Omit<Box, 'id'>>) => {
      const index = state.boxes.findIndex((box) => box.id === id)
      if (index === -1) return
      const current = state.boxes[index]
      const next = normalizeBox({ ...current, ...patch }, state.thickness)
      if (JSON.stringify(next) === JSON.stringify(current)) return
      record(state)
      state.boxes[index] = next
      state.pieces = rebuildBox(state.pieces, next, state.thickness)
    }

    /** A new box, or a copy, placed clear of everything else and selected. */
    const placeBox = (state: DesignState, box: Omit<Box, 'id'>) => {
      record(state)
      const bounds = wallBounds(state)
      const id = nextId()
      const { wall: _wall, ...rest } = box
      const placed = normalizeBox(
        {
          ...rest,
          ...onActiveWall(state),
          id,
          x: bounds ? bounds.maxX + PLACEMENT_GAP : -box.width / 2,
        },
        state.thickness,
      )
      state.boxes.push(placed)
      state.pieces = rebuildBox(state.pieces, placed, state.thickness)
      if (state.defaultColor) {
        for (const piece of state.pieces) if (piece.boxId === id) piece.color = state.defaultColor
      }
      state.selectedId = `${id}:left`
      state.selectedIds = [state.selectedId]
    }

    /** Ids plus, for any box panel among them, every other panel of that box. */
    const withWholeBoxes = (state: DesignState, ids: string[]) => {
      const boxIds = new Set(
        state.pieces.filter((piece) => ids.includes(piece.id) && piece.boxId).map((p) => p.boxId),
      )
      return new Set([
        ...ids,
        ...state.pieces.filter((piece) => boxIds.has(piece.boxId)).map((piece) => piece.id),
      ])
    }

    return {
      pieces: [],
      boxes: [],
      canPaste: readClipboard() !== null,
      selectedId: null,
      selectedIds: [],
      thickness: DEFAULT_THICKNESS,
      defaultColor: null,
      unitDepth: DEFAULT_UNIT_DEPTH,
      room: DEFAULT_ROOM,
      activeWall: 'back',

      past: [],
      future: [],
      batch: { open: false, recorded: false },

      addPiece: (kind) =>
        set((state) => {
          record(state)
          const piece: Piece = {
            ...createPiece(kind, nextId(), state.thickness, state.unitDepth),
            ...onActiveWall(state),
          }
          // Drop it on the floor to the right of everything else on this wall,
          // so a new piece never lands hidden behind one that is already there.
          const bounds = wallBounds(state)
          if (bounds) piece.x = bounds.maxX + PLACEMENT_GAP
          if (state.defaultColor) piece.color = state.defaultColor
          state.pieces.push(normalizePiece(piece, state.thickness))
          state.selectedId = piece.id
          state.selectedIds = [piece.id]
        }),

      addBox: () =>
        set((state) => {
          placeBox(state, {
            x: 0,
            y: 0,
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            depth: state.unitDepth,
            joint: 'between',
          })
        }),

      updateBox: (id, patch) =>
        set((state) => {
          changeBox(state, id, patch)
          // A box moved to another wall takes the view with it.
          followSelection(state)
        }),

      separateBox: (id) =>
        set((state) => {
          if (!state.boxes.some((box) => box.id === id)) return
          record(state)
          state.boxes = state.boxes.filter((box) => box.id !== id)
          state.pieces = state.pieces.map((piece) => {
            if (piece.boxId !== id) return piece
            const { boxId: _box, ...loose } = piece
            return loose
          })
        }),

      updatePiece: (id, patch) =>
        set((state) => {
          const index = state.pieces.findIndex((piece) => piece.id === id)
          if (index === -1) return
          const boxId = state.pieces[index].boxId
          if (boxId) {
            // A box's panel moves the whole box, by as far as it was moved.
            const box = state.boxes.find((candidate) => candidate.id === boxId)
            if (!box) return
            const dx = (patch.x ?? state.pieces[index].x) - state.pieces[index].x
            const dy = (patch.y ?? state.pieces[index].y) - state.pieces[index].y
            const wall = 'wall' in patch ? { wall: patch.wall } : {}
            changeBox(state, boxId, { x: box.x + dx, y: box.y + dy, ...wall })
            followSelection(state)
            return
          }
          const next = normalizePiece({ ...state.pieces[index], ...patch }, state.thickness)
          // A click with no real movement shouldn't leave an empty undo step.
          if (samePiece(state.pieces[index], next)) return
          record(state)
          state.pieces[index] = next
          // A part moved to another wall takes the view with it.
          followSelection(state)
        }),

      movePieces: (ids, dx, dy) =>
        set((state) => {
          const wanted = new Set(ids)
          const onWall = state.pieces.filter(
            (piece) => wanted.has(piece.id) && wallOf(piece) === state.activeWall,
          )
          const loose = onWall.filter((piece) => !piece.boxId)
          const boxIds = new Set(onWall.map((piece) => piece.boxId).filter(Boolean))
          const boxes = state.boxes.filter((box) => boxIds.has(box.id))
          const lowest = Math.min(...loose.map((p) => p.y), ...boxes.map((box) => box.y))
          if (!Number.isFinite(lowest)) return
          const dropY = Math.max(Math.round(dy), -lowest)
          const moveX = Math.round(dx)
          if (moveX === 0 && dropY === 0) return
          record(state)
          const moved = new Set(loose.map((piece) => piece.id))
          state.pieces = state.pieces.map((piece) =>
            moved.has(piece.id)
              ? normalizePiece({ ...piece, x: piece.x + moveX, y: piece.y + dropY }, state.thickness)
              : piece,
          )
          // Not through `changeBox`, which would record a second undo step.
          for (const box of boxes) {
            const next = normalizeBox({ ...box, x: box.x + moveX, y: box.y + dropY }, state.thickness)
            state.boxes = state.boxes.map((candidate) => (candidate.id === box.id ? next : candidate))
            state.pieces = rebuildBox(state.pieces, next, state.thickness)
          }
        }),

      duplicatePiece: (id) =>
        set((state) => {
          const source = state.pieces.find((piece) => piece.id === id)
          if (!source) return
          const box = state.boxes.find((candidate) => candidate.id === source.boxId)
          if (box) {
            placeBox(state, box)
            return
          }
          record(state)
          const copy = normalizePiece(
            { ...source, id: nextId(), x: source.x + source.width + PLACEMENT_GAP },
            state.thickness,
          )
          state.pieces.push(copy)
          state.selectedId = copy.id
          state.selectedIds = [copy.id]
        }),

      removePiece: (id) =>
        set((state) => {
          const piece = state.pieces.find((candidate) => candidate.id === id)
          if (!piece) return
          record(state)
          if (piece.boxId) {
            // Deleting any panel of a box deletes the box.
            state.boxes = state.boxes.filter((box) => box.id !== piece.boxId)
            state.pieces = state.pieces.filter((candidate) => candidate.boxId !== piece.boxId)
            state.selectedId = null
            state.selectedIds = []
            return
          }
          state.pieces = state.pieces.filter((candidate) => candidate.id !== id)
          state.selectedIds = state.selectedIds.filter((selected) => selected !== id)
          if (state.selectedId === id) state.selectedId = state.selectedIds.at(-1) ?? null
        }),

      select: (id) =>
        set((state) => {
          state.selectedId = id
          state.selectedIds = id ? [id] : []
          followSelection(state)
        }),

      toggleSelect: (id) =>
        set((state) => {
          if (state.selectedIds.includes(id)) {
            state.selectedIds = state.selectedIds.filter((selected) => selected !== id)
            if (state.selectedId === id) state.selectedId = state.selectedIds.at(-1) ?? null
          } else {
            state.selectedIds.push(id)
            state.selectedId = id
            followSelection(state)
          }
        }),

      selectMany: (ids, add = false) =>
        set((state) => {
          const next = add ? [...new Set([...state.selectedIds, ...ids])] : ids
          state.selectedIds = next
          state.selectedId = next.at(-1) ?? null
          followSelection(state)
        }),

      copySelection: () => {
        const state = get()
        const ids = withWholeBoxes(state, state.selectedIds)
        if (ids.size === 0) return
        const pieces = state.pieces.filter((piece) => ids.has(piece.id))
        const boxIds = new Set(pieces.map((piece) => piece.boxId))
        const boxes = state.boxes.filter((box) => boxIds.has(box.id))
        writeClipboard({ pieces, boxes, thickness: state.thickness })
        set((draft) => {
          draft.canPaste = true
        })
      },

      paste: () =>
        set((state) => {
          const copied = readClipboard()
          const copiedBounds = copied && contentBounds(copied.pieces)
          if (!copied || !copiedBounds) return
          record(state)
          // On the wall being edited, clear of everything already on it, keeping
          // the parts' layout and heights.
          const bounds = wallBounds(state)
          const dx = bounds ? bounds.maxX + PLACEMENT_GAP - copiedBounds.minX : 0
          const pasted: string[] = []

          for (const piece of copied.pieces.filter((candidate) => !candidate.boxId)) {
            const { wall: _wall, ...rest } = piece
            const moved = { ...rest, ...onActiveWall(state), id: nextId(), x: piece.x + dx }
            const copy = normalizePiece(moved, state.thickness)
            state.pieces.push(copy)
            pasted.push(copy.id)
          }
          for (const box of copied.boxes) {
            const id = nextId()
            const { wall: _wall, ...rest } = box
            const placed = normalizeBox(
              { ...rest, ...onActiveWall(state), id, x: box.x + dx },
              state.thickness,
            )
            state.boxes.push(placed)
            state.pieces = rebuildBox(state.pieces, placed, state.thickness)
            // A box's panels are rebuilt, so carry over their colours by role
            // (panel ids are `<box id>:<role>`).
            for (const piece of state.pieces) {
              if (piece.boxId !== id) continue
              const source = copied.pieces.find((p) => p.id === piece.id.replace(id, box.id))
              if (source?.color) piece.color = source.color
              pasted.push(piece.id)
            }
          }

          state.selectedIds = pasted
          state.selectedId = pasted.at(-1) ?? null
        }),

      refreshClipboard: () =>
        set((state) => {
          state.canPaste = readClipboard() !== null
        }),

      removePieces: (ids) =>
        set((state) => {
          const doomed = withWholeBoxes(state, ids)
          if (doomed.size === 0) return
          record(state)
          const doomedBoxes = new Set(
            state.pieces.filter((piece) => doomed.has(piece.id)).map((piece) => piece.boxId),
          )
          state.boxes = state.boxes.filter((box) => !doomedBoxes.has(box.id))
          state.pieces = state.pieces.filter((piece) => !doomed.has(piece.id))
          state.selectedIds = []
          state.selectedId = null
        }),

      setPieceColors: (ids, color) =>
        set((state) => {
          // A box's panels are coloured together, like they're selected together.
          const targets = withWholeBoxes(state, ids)
          const changes = state.pieces.some(
            (piece) => targets.has(piece.id) && (piece.color ?? null) !== color,
          )
          if (!changes) return
          record(state)
          for (const piece of state.pieces) {
            if (!targets.has(piece.id)) continue
            if (color) piece.color = color
            else delete piece.color
          }
        }),

      setDefaultColor: (color) =>
        set((state) => {
          state.defaultColor = color
        }),

      setThickness: (patch) =>
        set((state) => {
          const merged = { ...state.thickness, ...patch }
          const next = { body: atLeastOne(merged.body), back: atLeastOne(merged.back) }
          if (next.body === state.thickness.body && next.back === state.thickness.back) return
          record(state)
          state.thickness = next
          state.boxes = state.boxes.map((box) => normalizeBox(box, next))
          state.pieces = withBoxPanels(
            state.pieces.map((piece) => normalizePiece(piece, next)),
            state.boxes,
            next,
          )
        }),

      setUnitDepth: (mm) =>
        set((state) => {
          state.unitDepth = clampUnitDepth(mm)
        }),

      setRoom: (patch) =>
        set((state) => {
          const merged = { ...state.room, ...patch }
          const next: Room = {
            left: !!merged.left,
            right: !!merged.right,
            width: clampRoomSize(merged.width),
            depth: clampRoomSize(merged.depth),
          }
          if (JSON.stringify(next) === JSON.stringify(state.room)) return
          record(state)
          state.room = next
          // Parts can't stay on a wall that's switched off, or they'd be hidden
          // but still in the cut list.
          const kept = new Set(activeWalls(next))
          state.boxes = state.boxes.filter((box) => kept.has(wallOf(box)))
          state.pieces = state.pieces.filter((piece) => kept.has(wallOf(piece)))
          const ids = new Set(state.pieces.map((piece) => piece.id))
          state.selectedIds = state.selectedIds.filter((id) => ids.has(id))
          if (state.selectedId && !ids.has(state.selectedId)) {
            state.selectedId = state.selectedIds.at(-1) ?? null
          }
          keepActiveWall(state)
        }),

      setActiveWall: (wall) =>
        set((state) => {
          if (state.activeWall === wall || !activeWalls(state.room).includes(wall)) return
          state.activeWall = wall
          const onWall = new Set(
            state.pieces.filter((piece) => wallOf(piece) === wall).map((piece) => piece.id),
          )
          state.selectedIds = state.selectedIds.filter((id) => onWall.has(id))
          if (state.selectedId && !onWall.has(state.selectedId)) {
            state.selectedId = state.selectedIds.at(-1) ?? null
          }
        }),

      clear: () =>
        set((state) => {
          if (state.pieces.length === 0) return
          record(state)
          state.pieces = []
          state.boxes = []
          state.selectedId = null
          state.selectedIds = []
        }),

      loadProject: (project) =>
        set((state) => {
          state.pieces = project.pieces
          state.boxes = project.boxes ?? []
          state.thickness = project.thickness
          state.defaultColor = project.defaultColor ?? null
          state.unitDepth = project.unitDepth ?? DEFAULT_UNIT_DEPTH
          state.room = project.room ?? DEFAULT_ROOM
          state.activeWall = 'back'
          state.selectedId = null
          state.selectedIds = []
          state.past = []
          state.future = []
          state.batch = { open: false, recorded: false }
        }),

      replaceDesign: (project) =>
        set((state) => {
          record(state)
          state.pieces = project.pieces
          state.boxes = project.boxes
          state.thickness = project.thickness
          state.unitDepth = project.unitDepth
          state.defaultColor = project.defaultColor ?? null
          state.room = project.room
          keepActiveWall(state)
          state.selectedId = null
          state.selectedIds = []
        }),

      undo: () =>
        set((state) => {
          const previous = state.past.pop()
          if (!previous) return
          state.future.push(snapshot())
          restore(state, previous)
        }),

      redo: () =>
        set((state) => {
          const next = state.future.pop()
          if (!next) return
          state.past.push(snapshot())
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

// Both are normalized, so the same fields come in the same order; comparing
// every field means a new one can't be forgotten here.
const samePiece = (a: Piece, b: Piece) => JSON.stringify(a) === JSON.stringify(b)
