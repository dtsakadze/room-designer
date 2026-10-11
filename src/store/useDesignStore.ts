import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { BoardKey, BoardMaterial, SheetSetup, JointType, Box, Piece, PieceKind, Room, Thickness, Wall } from '../types'
import { type Rect, contentBounds, normalizePiece } from '../lib/geometry'
import { BOARDS, MAX_THICKNESS, PLACEMENT_GAP, createPiece } from '../lib/defaults'
import { DESIGN_KEYS, type Design, type ProjectData, clampUnitDepth, cleanBoardName, designOf, newDesign } from '../lib/project'
import { BOX_HEIGHT, BOX_WIDTH, normalizeBox, rebuildBox, withBoxPanels, withPanelFinish } from '../lib/box'
import { readClipboard, writeClipboard } from '../lib/clipboard'
import { newId } from '../lib/ids'
import { activeWalls, clampRoomSize, wallOf } from '../lib/room'
import { cleanSheet } from '../lib/sheets'
import type { Look } from '../lib/looks'
import { clampHolePitch, isAdjustable, snapToHoles } from '../lib/shelfPins'

/**
 * Settings that only affect parts added later, so undo skips them. They're
 * still saved.
 */
const NOT_UNDONE = ['defaultColor', 'unitDepth'] as const

/** The part of the state that undo/redo rewinds: the design, less `NOT_UNDONE`. Selection isn't in it. */
type Snapshot = Omit<Design, (typeof NOT_UNDONE)[number]>

const SNAPSHOT_KEYS = DESIGN_KEYS.filter((key) => !(NOT_UNDONE as readonly string[]).includes(key))

/** Oldest steps are dropped past this, so a long session can't grow forever. */
const HISTORY_LIMIT = 200

/** The open design (saved, and undone apart from `NOT_UNDONE`), and how it's being edited. */
type DesignState = Design & {
  /**
   * Every selected part; more than one for a multi-selection. The last is the
   * primary one, the part the inspector shows and the last one clicked
   * (`selectedIdOf`).
   */
  selectedIds: string[]
  /**
   * The wall being edited: the canvas shows its unit, and new parts go on it.
   * Like the selection, it isn't saved or undone.
   */
  activeWall: Wall
  /**
   * Whether the whole room is on screen (the top view). Only then can a
   * selection span walls; otherwise it keeps to the wall being edited, so
   * Delete or a move never reaches parts that aren't drawn. Not saved or undone.
   */
  wholeRoomShown: boolean

  past: Snapshot[]
  future: Snapshot[]
  /** While a batch is open, all changes undo as one step (see `beginBatch`). */
  batch: { open: boolean; recorded: boolean }

  /** Adds a part; `options` overrides its starting values (e.g. sliding doors, a door with `sliding`). */
  addPiece: (kind: PieceKind, options?: Partial<Piece>) => void
  addBox: () => void
  /** Resizes, moves or changes a box; its panels are rebuilt to match. */
  updateBox: (id: string, patch: Partial<Omit<Box, 'id'>>) => void
  /** Turns a box's panels into ordinary pieces that can be edited one by one. */
  separateBox: (id: string) => void
  /**
   * On a box's panel, only a move, edge banding and grain apply: a move moves
   * the whole box (the same goes for `duplicatePiece` and `removePieces`), while
   * banding and grain are the panel's own.
   */
  updatePiece: (id: string, patch: Partial<Omit<Piece, 'id' | 'kind'>>) => void
  /**
   * Moves several parts together by the same distance, as one undo step; a
   * box's panel moves its whole box. Only parts on the wall being edited move,
   * and never below the floor: the lowest one stops there and the rest keep
   * their places relative to it.
   */
  movePieces: (ids: string[], dx: number, dy: number) => void
  /**
   * Nudges the selection (the arrow keys): several parts move together, one
   * part on its own. With `byHoles`, an adjustable shelf steps up or down a
   * shelf-pin hole at a time, since it only sits on one.
   */
  nudgeSelection: (dx: number, dy: number, byHoles?: boolean) => void
  /**
   * Resizes the one selected part with `resize` (⌘ + an arrow key), or its
   * whole box when it's a box's panel. Nothing happens for several parts or
   * when `resize` gives null.
   */
  resizeSelection: (resize: (rect: Rect) => Rect | null) => void
  duplicatePiece: (id: string) => void
  select: (id: string | null) => void
  /** Adds a part to the selection, or takes it out if it's already in (⌘-click). */
  toggleSelect: (id: string) => void
  /** Selects these parts (e.g. from a selection rectangle), or adds them to the selection. */
  selectMany: (ids: string[], add?: boolean) => void
  /** Something has been copied (here or in another tab), so paste can work. */
  canPaste: boolean
  /** The selected parts, whole boxes included, as `toProjectData` takes them; null with none. */
  selectionParts: () => { pieces: Piece[]; boxes: Box[]; thickness: Thickness } | null
  /** Copies the selected parts (whole boxes, if any panel of one is selected). */
  copySelection: () => void
  /**
   * Pastes the copied parts, from this project or another, to the right of
   * everything here, as one undo step, and selects them. They take this
   * project's board thickness.
   */
  paste: () => void
  /** Puts a saved block's parts on the wall being edited, clear of what's there, as one undo step. */
  insertBlock: (design: ProjectData) => void
  /** Re-checks for copied parts, e.g. after another tab copied something. */
  refreshClipboard: () => void
  /** Deletes several parts at once, as one undo step. */
  removePieces: (ids: string[]) => void
  /** Gives parts their own colour, or null to go back to the standard look. */
  setPieceColors: (ids: string[], color: string | null) => void
  setDefaultColor: (color: string | null) => void
  setThickness: (patch: Partial<Thickness>) => void
  /** Names a board for the cut list; an empty name goes back to its role. */
  setBoardName: (board: BoardKey, name: string) => void
  setBoardMaterial: (board: BoardKey, material: BoardMaterial) => void
  /** Buys a board as whole sheets of this size, or null for cut to size. */
  setBoardSheet: (board: BoardKey, sheet: SheetSetup | null) => void
  setJoints: (joints: JointType) => void
  /**
   * Sets every board's colour, edge banding colour and grain to a look, as one
   * undo step. With `resetParts`, parts coloured by hand go back to their board's.
   */
  applyLook: (look: Look, resetParts: boolean) => void
  /** Says whether a board has a grain, which the cut list then follows. */
  setBoardGrain: (board: BoardKey, grain: boolean) => void
  /** Colours a board's parts (those without a colour of their own), or null for the standard look. */
  setBoardColor: (board: BoardKey, color: string | null) => void
  /** Colours a board's edge banding, or null to show it like the board. */
  setEdgeColor: (board: BoardKey, color: string | null) => void
  /** Changes the hole spacing, and moves every adjustable shelf onto the new holes. */
  setHolePitch: (mm: number) => void
  setUnitDepth: (mm: number) => void
  /** Changes the room; a wall switched off takes its parts with it. */
  setRoom: (patch: Partial<Room>) => void
  /** Switches the wall being edited, leaving behind a selection on the old one. */
  setActiveWall: (wall: Wall) => void
  /** Says whether the whole room is on screen; leaving it lets go of parts on other walls. */
  setWholeRoomShown: (shown: boolean) => void
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

/** The primary selected part: the inspector shows it. A string or null, so it's safe as a selector. */
export const selectedIdOf = (state: { selectedIds: string[] }) => state.selectedIds.at(-1) ?? null

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
      const state = get()
      return Object.fromEntries(SNAPSHOT_KEYS.map((key) => [key, state[key]])) as Snapshot
    }

    const restore = (state: DesignState, snapshot: Snapshot) => {
      Object.assign(state, snapshot)
      const ids = new Set(snapshot.pieces.map((piece) => piece.id))
      state.selectedIds = state.selectedIds.filter((id) => ids.has(id))
      // Undoing a move to another wall puts the part back on its old one: the
      // view goes with it, so the selection is never a part that isn't drawn.
      followSelection(state)
      keepActiveWall(state)
      // Undo in the middle of a drag or of typing: the rest of it becomes a
      // new step of its own. Otherwise it would record nothing, leaving a stale
      // redo and no way back to where it started.
      if (state.batch.open) state.batch.recorded = false
    }

    /** Falls back to the back wall when the one being edited is switched off. */
    const keepActiveWall = (state: DesignState) => {
      if (!activeWalls(state.room).includes(state.activeWall)) state.activeWall = 'back'
    }

    /**
     * The wall a selection is on, so selecting a part brings you to its wall.
     * Unless the whole room is shown, parts on other walls drop out of the
     * selection: ⌘-clicking a part on another wall in the Parts list starts
     * a selection there.
     */
    const followSelection = (state: DesignState) => {
      const primary = selectedIdOf(state)
      const piece = state.pieces.find((candidate) => candidate.id === primary)
      if (piece) state.activeWall = wallOf(piece)
      if (!state.wholeRoomShown) keepSelectionOnWall(state)
    }

    const keepSelectionOnWall = (state: DesignState) => {
      const onWall = new Set(
        state.pieces.filter((piece) => wallOf(piece) === state.activeWall).map((piece) => piece.id),
      )
      state.selectedIds = state.selectedIds.filter((id) => onWall.has(id))
    }

    /** Where new parts on the wall being edited go: right of everything already on it. */
    const wallBounds = (state: DesignState) =>
      contentBounds(state.pieces.filter((piece) => wallOf(piece) === state.activeWall))

    /** How a part or box is stored on the wall being edited: no value for the back wall. */
    const onActiveWall = (state: DesignState) =>
      state.activeWall === 'back' ? {} : { wall: state.activeWall }

    /**
     * An adjustable shelf moved onto the nearest shelf-pin hole, since it can
     * only sit where holes are drilled; any other part as it is.
     */
    const onHoles = (state: DesignState, piece: Piece, pieces = state.pieces): Piece =>
      isAdjustable(piece) ? { ...piece, y: snapToHoles(piece, pieces, state.holePitch) } : piece

    /**
     * Puts copied parts (a paste, or a saved block) on the wall being edited,
     * as one undo step, and selects them. Nothing happens when there are none.
     */
    const placeCopied = (state: DesignState, copied: ProjectData) => {
      const copiedBounds = contentBounds(copied.pieces)
      if (!copiedBounds) return
      record(state)
      // On the wall being edited, clear of everything already on it, keeping
      // the parts' layout and heights.
      const bounds = wallBounds(state)
      const dx = bounds ? bounds.maxX + PLACEMENT_GAP - copiedBounds.minX : 0
      const pasted: string[] = []

      for (const piece of copied.pieces.filter((candidate) => !candidate.boxId)) {
        const { wall: _wall, ...rest } = piece
        const moved = { ...rest, ...onActiveWall(state), id: newId(), x: piece.x + dx }
        const copy = normalizePiece(moved, state.thickness)
        state.pieces.push(copy)
        pasted.push(copy.id)
      }
      for (const box of copied.boxes) {
        const id = newId()
        const { wall: _wall, ...rest } = box
        const placed = normalizeBox(
          { ...rest, ...onActiveWall(state), id, x: box.x + dx },
          state.thickness,
        )
        state.boxes.push(placed)
        state.pieces = rebuildBox(state.pieces, placed, state.thickness)
        copyPanelFinishes(state, id, box.id, copied.pieces)
        for (const piece of state.pieces) if (piece.boxId === id) pasted.push(piece.id)
      }

      // Adjustable shelves go on this project's holes (its spacing may differ
      // from where they were copied), once the sides they sit between are in.
      const placed = state.pieces
      state.pieces = placed.map((piece) => (pasted.includes(piece.id) ? onHoles(state, piece, placed) : piece))

      state.selectedIds = pasted
    }

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

    /**
     * Gives a box's rebuilt panels the colours, banding and grain of another
     * box's panels, matched by role (panel ids are `<box id>:<role>`).
     */
    const copyPanelFinishes = (state: DesignState, boxId: string, sourceBoxId: string, sources: Piece[]) => {
      state.pieces = state.pieces.map((piece) => {
        if (piece.boxId !== boxId) return piece
        const source = sources.find((candidate) => candidate.id === piece.id.replace(boxId, sourceBoxId))
        return source ? withPanelFinish(piece, source, state.thickness) : piece
      })
    }

    /**
     * `updatePiece` on a box's panel: banding and grain are the panel's own,
     * and a move moves the whole box, by as far as the panel was moved.
     */
    const updatePanel = (state: DesignState, index: number, patch: Partial<Piece>) => {
      const panel = state.pieces[index]
      if ('bands' in patch || 'grain' in patch) {
        const { bands, grain } = { ...panel, ...patch }
        const next = normalizePiece({ ...panel, bands, grain }, state.thickness)
        if (samePiece(panel, next)) return
        record(state)
        state.pieces[index] = next
        return
      }
      const box = state.boxes.find((candidate) => candidate.id === panel.boxId)
      if (!box) return
      const dx = (patch.x ?? panel.x) - panel.x
      const dy = (patch.y ?? panel.y) - panel.y
      const wall = 'wall' in patch ? { wall: patch.wall } : {}
      changeBox(state, box.id, { x: box.x + dx, y: box.y + dy, ...wall })
      followSelection(state)
    }

    /**
     * A new box, or a copy, placed clear of everything else and selected. Its
     * panels start in the new-part colour, unless `startColor` is false.
     * Returns its id.
     */
    const placeBox = (state: DesignState, box: Omit<Box, 'id'>, startColor = true) => {
      record(state)
      const bounds = wallBounds(state)
      const id = newId()
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
      if (startColor && state.defaultColor) {
        for (const piece of state.pieces) if (piece.boxId === id) piece.color = state.defaultColor
      }
      state.selectedIds = [`${id}:left`]
      return id
    }

    /**
     * Sets one board's entry in a per-board setting (a map in the state), as
     * one undo step; null is the default, stored as no entry. Nothing happens
     * when it's already so.
     */
    const setBoardEntry = <T>(
      state: DesignState,
      map: Partial<Record<BoardKey, T>>,
      board: BoardKey,
      value: T | null,
    ) => {
      if (JSON.stringify(map[board] ?? null) === JSON.stringify(value)) return
      record(state)
      if (value === null) delete map[board]
      else map[board] = value
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
      ...newDesign(),
      canPaste: readClipboard() !== null,
      selectedIds: [],
      activeWall: 'back',
      wholeRoomShown: false,

      past: [],
      future: [],
      batch: { open: false, recorded: false },

      addPiece: (kind, options) =>
        set((state) => {
          record(state)
          const base = createPiece(kind, newId(), state.thickness, state.unitDepth)
          const piece: Piece = {
            ...base,
            ...options,
            // Centred on x = 0 like any new part, whatever width the options gave it.
            x: -(options?.width ?? base.width) / 2,
            ...onActiveWall(state),
          }
          // Drop it on the floor to the right of everything else on this wall,
          // so a new piece never lands hidden behind one that is already there.
          const bounds = wallBounds(state)
          if (bounds) piece.x = bounds.maxX + PLACEMENT_GAP
          // A cornice goes on top of what's there, as wide as it.
          if (kind === 'cornice' && bounds && !options?.width) {
            piece.x = bounds.minX
            piece.y = bounds.maxY
            piece.width = bounds.maxX - bounds.minX
          }
          if (state.defaultColor) piece.color = state.defaultColor
          state.pieces.push(onHoles(state, normalizePiece(piece, state.thickness)))
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
          if (state.pieces[index].boxId) {
            updatePanel(state, index, patch)
            return
          }
          const next = onHoles(
            state,
            normalizePiece({ ...state.pieces[index], ...patch }, state.thickness),
          )
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
          const moved = new Set(loose.map((piece) => piece.id))
          let pieces = state.pieces.map((piece) =>
            moved.has(piece.id)
              ? normalizePiece({ ...piece, x: piece.x + moveX, y: piece.y + dropY }, state.thickness)
              : piece,
          )
          // Not through `changeBox`, which would record a second undo step.
          let nextBoxes = state.boxes
          for (const box of boxes) {
            const next = normalizeBox({ ...box, x: box.x + moveX, y: box.y + dropY }, state.thickness)
            nextBoxes = nextBoxes.map((candidate) => (candidate.id === box.id ? next : candidate))
            pieces = rebuildBox(pieces, next, state.thickness)
          }
          // Shelves go onto the holes where everything has ended up. A small
          // nudge can leave them where they were; then nothing has moved.
          const placed = pieces
          pieces = placed.map((piece) => (moved.has(piece.id) ? onHoles(state, piece, placed) : piece))
          if (boxes.length === 0 && pieces.every((piece, i) => samePiece(piece, state.pieces[i]))) {
            return
          }
          record(state)
          state.pieces = pieces
          state.boxes = nextBoxes
        }),

      nudgeSelection: (dx, dy, byHoles = false) => {
        const { selectedIds, pieces, holePitch, movePieces, updatePiece } = get()
        if (selectedIds.length > 1) {
          movePieces(selectedIds, dx, dy)
          return
        }
        const piece = pieces.find((candidate) => candidate.id === selectedIds[0])
        if (!piece) return
        const step = dy && byHoles && isAdjustable(piece) ? Math.sign(dy) * holePitch : dy
        updatePiece(piece.id, { x: piece.x + dx, y: piece.y + step })
      },

      resizeSelection: (resize) => {
        const { selectedIds, pieces, boxes, updatePiece, updateBox } = get()
        if (selectedIds.length !== 1) return
        const piece = pieces.find((candidate) => candidate.id === selectedIds[0])
        if (!piece) return
        const box = piece.boxId ? boxes.find((candidate) => candidate.id === piece.boxId) : undefined
        const resized = resize(box ?? piece)
        if (!resized) return
        if (box) updateBox(box.id, resized)
        else updatePiece(piece.id, resized)
      },

      duplicatePiece: (id) =>
        set((state) => {
          const source = state.pieces.find((piece) => piece.id === id)
          if (!source) return
          const box = state.boxes.find((candidate) => candidate.id === source.boxId)
          if (box) {
            const panels = state.pieces.filter((piece) => piece.boxId === box.id)
            // Not in the new-part colour: a copy should look like what was copied.
            copyPanelFinishes(state, placeBox(state, box, false), box.id, panels)
            return
          }
          record(state)
          const copy = onHoles(
            state,
            normalizePiece(
              { ...source, id: newId(), x: source.x + source.width + PLACEMENT_GAP },
              state.thickness,
            ),
          )
          state.pieces.push(copy)
          state.selectedIds = [copy.id]
        }),

      select: (id) =>
        set((state) => {
          state.selectedIds = id ? [id] : []
          followSelection(state)
        }),

      toggleSelect: (id) =>
        set((state) => {
          if (state.selectedIds.includes(id)) {
            state.selectedIds = state.selectedIds.filter((selected) => selected !== id)
          } else {
            state.selectedIds.push(id)
            followSelection(state)
          }
        }),

      selectMany: (ids, add = false) =>
        set((state) => {
          state.selectedIds = add ? [...new Set([...state.selectedIds, ...ids])] : ids
          followSelection(state)
        }),

      selectionParts: () => {
        const state = get()
        const ids = withWholeBoxes(state, state.selectedIds)
        if (ids.size === 0) return null
        const pieces = state.pieces.filter((piece) => ids.has(piece.id))
        const boxIds = new Set(pieces.map((piece) => piece.boxId))
        const boxes = state.boxes.filter((box) => boxIds.has(box.id))
        return { pieces, boxes, thickness: state.thickness }
      },

      copySelection: () => {
        const parts = get().selectionParts()
        if (!parts) return
        writeClipboard(parts)
        set((draft) => {
          draft.canPaste = true
        })
      },

      paste: () =>
        set((state) => {
          const copied = readClipboard()
          if (copied) placeCopied(state, copied)
        }),

      insertBlock: (design) =>
        set((state) => {
          placeCopied(state, design)
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
          const next = Object.fromEntries(
            BOARDS.map(({ key }) => [key, Math.min(MAX_THICKNESS, atLeastOne(merged[key]))]),
          ) as Thickness
          if (BOARDS.every(({ key }) => next[key] === state.thickness[key])) return
          record(state)
          state.thickness = next
          state.boxes = state.boxes.map((box) => normalizeBox(box, next))
          state.pieces = withBoxPanels(
            state.pieces.map((piece) => normalizePiece(piece, next)),
            state.boxes,
            next,
          )
        }),

      setBoardName: (board, name) =>
        set((state) => {
          setBoardEntry(state, state.boardNames, board, cleanBoardName(name))
        }),

      setBoardMaterial: (board, material) =>
        set((state) => {
          // Chipboard is the default, stored as no value.
          setBoardEntry(state, state.boardMaterials, board, material === 'chipboard' ? null : material)
        }),

      setBoardSheet: (board, sheet) =>
        set((state) => {
          setBoardEntry(state, state.boardSheets, board, sheet && cleanSheet(sheet))
        }),

      applyLook: (look, resetParts) =>
        set((state) => {
          const grained = BOARDS.map(({ key }) => key).filter((key) => look.grained.includes(key))
          const same =
            JSON.stringify([state.boardColors, state.edgeColors, state.grainedBoards]) ===
            JSON.stringify([look.boardColors, look.edgeColors, grained])
          const coloured = resetParts && state.pieces.some((piece) => piece.color)
          if (same && !coloured) return
          record(state)
          state.boardColors = { ...look.boardColors }
          state.edgeColors = { ...look.edgeColors }
          state.grainedBoards = grained
          if (resetParts) for (const piece of state.pieces) delete piece.color
        }),

      setJoints: (joints) =>
        set((state) => {
          if (state.joints === joints) return
          record(state)
          state.joints = joints
        }),

      setBoardGrain: (board, grain) =>
        set((state) => {
          if (state.grainedBoards.includes(board) === grain) return
          record(state)
          const next = new Set([...state.grainedBoards, board])
          if (!grain) next.delete(board)
          state.grainedBoards = BOARDS.map(({ key }) => key).filter((key) => next.has(key))
        }),

      setBoardColor: (board, color) =>
        set((state) => {
          setBoardEntry(state, state.boardColors, board, color)
        }),

      setEdgeColor: (board, color) =>
        set((state) => {
          setBoardEntry(state, state.edgeColors, board, color)
        }),

      setHolePitch: (mm) =>
        set((state) => {
          const pitch = clampHolePitch(mm)
          if (pitch === state.holePitch) return
          record(state)
          state.holePitch = pitch
          const before = state.pieces
          state.pieces = before.map((piece) => onHoles(state, piece, before))
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
            // Not set (no ceiling) is stored as no value.
            ...(merged.height ? { height: clampRoomSize(merged.height) } : {}),
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
          keepActiveWall(state)
        }),

      setActiveWall: (wall) =>
        set((state) => {
          if (state.activeWall === wall || !activeWalls(state.room).includes(wall)) return
          state.activeWall = wall
          keepSelectionOnWall(state)
        }),

      setWholeRoomShown: (shown) =>
        set((state) => {
          state.wholeRoomShown = shown
          if (!shown) keepSelectionOnWall(state)
        }),

      clear: () =>
        set((state) => {
          if (state.pieces.length === 0) return
          record(state)
          state.pieces = []
          state.boxes = []
          state.selectedIds = []
        }),

      loadProject: (project) =>
        set((state) => {
          Object.assign(state, designOf(project))
          state.activeWall = 'back'
          state.selectedIds = []
          state.past = []
          state.future = []
          state.batch = { open: false, recorded: false }
        }),

      replaceDesign: (project) =>
        set((state) => {
          record(state)
          Object.assign(state, designOf(project))
          keepActiveWall(state)
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
