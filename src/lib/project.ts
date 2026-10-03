import type { BoardKey, BoardNames, Box, Piece, PieceKind, Room, Thickness } from '../types'
import { normalizeBox, withBoxPanels } from './box'
import {
  BOARDS,
  DEFAULT_THICKNESS,
  DEFAULT_UNIT_DEPTH,
  MAX_BOARD_NAME,
  MAX_UNIT_DEPTH,
  MIN_UNIT_DEPTH,
  PIECE_LABELS,
} from './defaults'
import { isDimension, isEdge } from './edges'
import { isHexColor, normalizePiece } from './geometry'
import { DEFAULT_ROOM, clampRoomSize, isSideWall, wallOf } from './room'
import { DEFAULT_HOLE_PITCH, clampHolePitch } from './shelfPins'

/**
 * The version saves are written in. To change the saved shape:
 *
 * 1. bump this,
 * 2. add a step to `MIGRATIONS` that turns the previous version into this one,
 * 3. add a sample of the previous version to `fixtures/` and a test that it
 *    still opens (see `project.test.ts`).
 *
 * Never edit an existing step: saves in that version are out there.
 */
export const FORMAT_VERSION = 6

type Raw = Record<string, unknown>

/**
 * Step `n` turns version `n` into version `n + 1`. Loading runs every step
 * from the save's version up to `FORMAT_VERSION`, in order. Steps build new
 * objects rather than changing their input.
 */
const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  // v1 grew `unitDepth` and `boxes` over time, so older v1 saves lack them.
  // From v2 on they're always there.
  1: (data) => ({
    ...data,
    formatVersion: 2,
    unitDepth: data.unitDepth ?? DEFAULT_UNIT_DEPTH,
    boxes: data.boxes ?? [],
  }),
  // v3 adds the room: which walls have units on them, and its size. Everything
  // saved before stood on the back wall alone.
  2: (data) => ({
    ...data,
    formatVersion: 3,
    room: { left: false, right: false, width: 2400, depth: 1800 },
  }),
  // v4 adds doors (a new part kind, with `double`, `hinge` and `inset`) and a
  // drawer's runner type (`extension`) and front (`overlay`). Nothing older has any, so only the
  // version changes; the bump is there so an older app refuses such a save
  // rather than silently dropping them.
  3: (data) => ({ ...data, formatVersion: 4 }),
  // v5 gives fronts (doors, drawer fronts) and drawer boxes (their sides and
  // backs) boards of their own, and lets boards be named. Both were cut from
  // the body board before, so they start at its thickness and the design comes
  // out the same.
  4: (data) => {
    const thickness = isRecord(data.thickness) ? data.thickness : {}
    const body = thickness.body
    return {
      ...data,
      formatVersion: 5,
      thickness: { ...thickness, front: thickness.front ?? body, drawer: thickness.drawer ?? body },
    }
  },
  // v6 adds edge banding and grain: boards with a grain (`grainedBoards`) and
  // a part's own banded edges (`bands`) and grain (`grain`). Absent, each
  // means the usual ones, which is what older saves get. It also adds the
  // spacing of shelf-pin holes (`holePitch`), the usual 32 mm for older saves;
  // their shelves stay where they were until moved.
  5: (data) => ({ ...data, formatVersion: 6, holePitch: 32 }),
}

/** Why a save couldn't be opened. */
export type ReadProblem = 'newer' | 'invalid'

export type ReadResult = { ok: true; project: ProjectData } | { ok: false; problem: ReadProblem }

/**
 * A project as it's stored: the same shape goes into the browser's autosave
 * and, later, into saved JSON files. Selection and undo history aren't in it.
 */
export type ProjectData = {
  formatVersion: typeof FORMAT_VERSION
  savedAt: string
  /** Only in saved files, so opening one can name the new project. */
  name?: string
  thickness: Thickness
  /** What each board is, for the cut list; absent when none is named. */
  boardNames?: BoardNames
  /** Boards with a grain, whose parts the cut list gives grain-first; absent when none has. */
  grainedBoards?: BoardKey[]
  /** Spacing of the shelf-pin holes adjustable shelves sit on, in mm. */
  holePitch: number
  /** How deep new parts start. */
  unitDepth: number
  pieces: Piece[]
  /** Carcasses; their panels are in `pieces` too, but are rebuilt from these on load. */
  boxes: Box[]
  /** Colour new parts start with. Absent means the standard look. */
  defaultColor?: string
  /** Which walls have units on them, and the room's size. */
  room: Room
}

export function toProjectData(
  design: {
    pieces: Piece[]
    boxes?: Box[]
    thickness: Thickness
    boardNames?: BoardNames
    grainedBoards?: BoardKey[]
    holePitch?: number
    unitDepth?: number
    defaultColor?: string | null
    room?: Room
  },
  name?: string,
): ProjectData {
  const boardNames = design.boardNames ?? {}
  return {
    formatVersion: FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    ...(name ? { name } : {}),
    thickness: design.thickness,
    ...(Object.keys(boardNames).length > 0 ? { boardNames } : {}),
    ...(design.grainedBoards?.length ? { grainedBoards: design.grainedBoards } : {}),
    holePitch: design.holePitch ?? DEFAULT_HOLE_PITCH,
    unitDepth: design.unitDepth ?? DEFAULT_UNIT_DEPTH,
    pieces: design.pieces,
    boxes: design.boxes ?? [],
    ...(design.defaultColor ? { defaultColor: design.defaultColor } : {}),
    room: design.room ?? DEFAULT_ROOM,
  }
}

/**
 * Reads a save (autosave or file) of any version: older ones are upgraded
 * step by step, one from a newer version of the app is refused rather than
 * guessed at. The input is never changed.
 */
export function readProject(input: unknown): ReadResult {
  if (!isRecord(input)) return { ok: false, problem: 'invalid' }
  const version = input.formatVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, problem: 'invalid' }
  }
  if (version > FORMAT_VERSION) return { ok: false, problem: 'newer' }

  let data: Raw = input
  for (let step = version; step < FORMAT_VERSION; step++) {
    const migrate = MIGRATIONS[step]
    // A missing step is a bug in the app, not in the save.
    if (!migrate) throw new Error(`No migration from format version ${step}`)
    data = migrate(data)
  }

  const project = validate(data)
  return project ? { ok: true, project } : { ok: false, problem: 'invalid' }
}

/** `readProject` for callers that only need the project: null when it can't be opened. */
export function parseProject(data: unknown): ProjectData | null {
  const result = readProject(data)
  return result.ok ? result.project : null
}

/**
 * Checks a save that's already in the current version. Nothing is trusted, as
 * it may be hand-edited: unknown pieces are dropped and every piece goes
 * through the same normalising as an edit does. A box's panels are rebuilt
 * from the box, so they can't disagree with it.
 */
function validate(data: Raw): ProjectData | null {
  if (data.formatVersion !== FORMAT_VERSION || !Array.isArray(data.pieces)) return null

  const stored = isRecord(data.thickness) ? data.thickness : {}
  const body = positive(stored.body) ?? DEFAULT_THICKNESS.body
  // Fronts and drawer boxes were body board until they had their own.
  const thickness: Thickness = {
    body,
    back: positive(stored.back) ?? DEFAULT_THICKNESS.back,
    front: positive(stored.front) ?? body,
    drawer: positive(stored.drawer) ?? body,
  }
  const boardNames = readBoardNames(data.boardNames)
  const grainedBoards = readGrainedBoards(data.grainedBoards)

  const pieces = data.pieces.flatMap((raw): Piece[] => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !isKind(raw.kind)) return []
    const numbers = ['x', 'y', 'width', 'height', 'depth'] as const
    if (!numbers.every((key) => typeof raw[key] === 'number' && Number.isFinite(raw[key]))) {
      return []
    }
    const piece = {
      id: raw.id,
      kind: raw.kind,
      x: raw.x as number,
      y: raw.y as number,
      width: raw.width as number,
      height: raw.height as number,
      depth: raw.depth as number,
    }
    const railAt = raw.railAt === 'back' ? ('back' as const) : undefined
    const boxId = typeof raw.boxId === 'string' ? raw.boxId : undefined
    const color = isHexColor(raw.color) ? raw.color : undefined
    const wall = isSideWall(raw.wall) ? raw.wall : undefined
    const hinge = raw.hinge === 'right' ? ('right' as const) : undefined
    const door = { double: raw.double === true, hinge, inset: raw.inset === true }
    const drawer = {
      extension: raw.extension === 'full' ? ('full' as const) : undefined,
      overlay: raw.overlay === true,
    }
    // Checked against the part's own board in `normalizePiece`.
    const finish = {
      bands: Array.isArray(raw.bands) ? raw.bands.filter(isEdge) : undefined,
      grain: isDimension(raw.grain) ? raw.grain : undefined,
    }
    const extras = { fixed: raw.fixed === true, railAt, boxId, color, wall, ...door, ...drawer, ...finish }
    return [normalizePiece({ ...piece, ...extras }, thickness)]
  })

  const boxes = (Array.isArray(data.boxes) ? data.boxes : []).flatMap((raw): Box[] => {
    if (!isRecord(raw) || typeof raw.id !== 'string') return []
    const numbers = ['x', 'y', 'width', 'height', 'depth'] as const
    if (!numbers.every((key) => typeof raw[key] === 'number' && Number.isFinite(raw[key]))) {
      return []
    }
    const box = {
      id: raw.id,
      x: raw.x as number,
      y: raw.y as number,
      width: raw.width as number,
      height: raw.height as number,
      depth: raw.depth as number,
      joint: raw.joint === 'on' ? ('on' as const) : ('between' as const),
      ...(isSideWall(raw.wall) ? { wall: raw.wall } : {}),
    }
    return [normalizeBox(box, thickness)]
  })

  const storedRoom = isRecord(data.room) ? data.room : {}
  // A wall with parts on it is always on, so no part can end up on a wall
  // that isn't shown.
  const used = new Set([...pieces, ...boxes].map(wallOf))
  const room: Room = {
    left: storedRoom.left === true || used.has('left'),
    right: storedRoom.right === true || used.has('right'),
    width: clampRoomSize(positive(storedRoom.width) ?? DEFAULT_ROOM.width),
    depth: clampRoomSize(positive(storedRoom.depth) ?? DEFAULT_ROOM.depth),
  }

  return {
    formatVersion: FORMAT_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    ...(typeof data.name === 'string' && data.name.trim() ? { name: data.name.trim() } : {}),
    thickness,
    ...(Object.keys(boardNames).length > 0 ? { boardNames } : {}),
    ...(grainedBoards.length > 0 ? { grainedBoards } : {}),
    holePitch: clampHolePitch(positive(data.holePitch) ?? DEFAULT_HOLE_PITCH),
    unitDepth: clampUnitDepth(positive(data.unitDepth) ?? DEFAULT_UNIT_DEPTH),
    pieces: withBoxPanels(pieces, boxes, thickness),
    boxes,
    ...(isHexColor(data.defaultColor) ? { defaultColor: data.defaultColor } : {}),
    room,
  }
}

/** Board names worth keeping: known boards, trimmed, not empty, not too long. */
export function readBoardNames(value: unknown): BoardNames {
  if (!isRecord(value)) return {}
  const names: BoardNames = {}
  for (const { key } of BOARDS) {
    const name = cleanBoardName(value[key])
    if (name) names[key] = name
  }
  return names
}

/** Boards with a grain: known boards, each once, in the order of `BOARDS`. */
export function readGrainedBoards(value: unknown): BoardKey[] {
  if (!Array.isArray(value)) return []
  return BOARDS.map((board) => board.key).filter((key) => value.includes(key))
}

/** A board name as it's kept, or null for none. */
export function cleanBoardName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().slice(0, MAX_BOARD_NAME).trim()
  return name || null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isKind = (value: unknown): value is PieceKind =>
  typeof value === 'string' && value in PIECE_LABELS

const positive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

export const clampUnitDepth = (mm: number) =>
  Math.min(MAX_UNIT_DEPTH, Math.max(MIN_UNIT_DEPTH, Math.round(mm)))
