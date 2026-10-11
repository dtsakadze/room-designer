import type { AccessoryType, BoardColors, BoardMaterial, BoardKey, BoardMaterials, BoardNames, BoardSheets, Box, HandleType, JointType, PaneType, Piece, PieceKind, Room, Thickness } from '../types'
import { normalizeBox, withBoxPanels } from './box'
import { DEFAULT_KERF, cleanSheet } from './sheets'
import {
  BOARDS,
  DEFAULT_THICKNESS,
  DEFAULT_UNIT_DEPTH,
  KINDS,
  MAX_BOARD_NAME,
  MAX_PIECES,
  MAX_THICKNESS,
  MATERIAL_LABELS,
  MAX_UNIT_DEPTH,
  MIN_UNIT_DEPTH,
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
export const FORMAT_VERSION = 18

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
  // means the usual ones, which is what older saves get, so only the version
  // changes; the bump makes an older app refuse such a save rather than drop
  // them.
  5: (data) => ({ ...data, formatVersion: 6 }),
  // v7 adds the spacing of shelf-pin holes (`holePitch`), the usual 32 mm for
  // older saves; their shelves stay where they were until moved. Doors may
  // have wide-angle (`openAngle`) and soft-close (`softClose`) hinges, and
  // drawers soft-close or push-to-open runners (`close`); absent, ordinary
  // ones, which is what older doors and drawers had. Doors and drawers may
  // have no handle (`noHandle`); absent, they have one.
  6: (data) => ({ ...data, formatVersion: 7, holePitch: 32 }),
  // v8 adds a colour per board (`boardColors`) and per board's edge banding
  // (`edgeColors`). Absent, parts keep the standard look and edges their
  // board's, as before, so only the version changes; the bump makes an older
  // app refuse such a save rather than drop the colours.
  7: (data) => ({ ...data, formatVersion: 8 }),
  // v9 adds sliding doors: a door's optional `sliding` (its panel count) and
  // `overlap`. Absent, a door is hinged as before, so only the version
  // changes; the bump makes an older app refuse such a save rather than show
  // the set as one hinged door and save it back that way.
  8: (data) => ({ ...data, formatVersion: 9 }),
  // v10 adds trim: `filler` and `cornice` part kinds, and the room's optional
  // ceiling `height`. Absent, there's no ceiling and no trim, as before, so
  // only the version changes; the bump makes an older app refuse such a save
  // rather than drop the trim and the ceiling.
  9: (data) => ({ ...data, formatVersion: 10 }),
  // v11 adds each part's and box's optional front-to-back position `z`.
  // Absent, it's placed automatically as before, so only the version changes;
  // the bump makes an older app refuse such a save rather than put the part
  // back against the back panel and save it that way.
  10: (data) => ({ ...data, formatVersion: 11 }),
  // v12 adds an optional material per board (`boardMaterials`). Absent, every
  // board is chipboard, as the span checks assume, so only the version
  // changes; the bump makes an older app refuse such a save rather than drop
  // the materials.
  11: (data) => ({ ...data, formatVersion: 12 }),
  // v13 adds an optional joint type (`joints`: `confirmat` or `cam`). Absent,
  // the carcass is joined with plain screws, as the hardware list counted
  // before, so only the version changes; the bump makes an older app refuse
  // such a save rather than drop the choice.
  12: (data) => ({ ...data, formatVersion: 13 }),
  // v14 adds a door's or drawer's optional `handle` (`bar`, `knob`, `profile`
  // or, for doors, `push`). Absent, it has a handle or knob as before, so only
  // the version changes; the bump makes an older app refuse such a save
  // rather than turn the choice back into a plain handle.
  13: (data) => ({ ...data, formatVersion: 14 }),
  // v15 adds a door's optional `pane` (`glass` or `mirror`). Absent, it's a
  // board door as before, so only the version changes; the bump makes an
  // older app refuse such a save rather than show glass as a board.
  14: (data) => ({ ...data, formatVersion: 15 }),
  // v16 adds `boardSheets`, the full sheet of each board that's bought as
  // whole sheets. Absent, every board is bought cut to size, as before, so
  // only the version changes; the bump makes an older app refuse such a save
  // rather than drop the sheets.
  15: (data) => ({ ...data, formatVersion: 16 }),
  // v17 adds the `accessory` part kind (pull-out racks, baskets, shoe racks),
  // with its `accessory` type. Nothing older has any, so only the version
  // changes; the bump makes an older app refuse such a save rather than drop
  // them.
  16: (data) => ({ ...data, formatVersion: 17 }),
  // v18 adds a rod's optional `lift` (hung from a pull-down lift). Absent, it's
  // a fixed rod as before, so only the version changes; the bump makes an
  // older app refuse such a save rather than turn the lift back into supports.
  17: (data) => ({ ...data, formatVersion: 18 }),
}

/** Why a save couldn't be opened. */
export type ReadProblem = 'newer' | 'invalid'

type ReadResult = { ok: true; project: ProjectData } | { ok: false; problem: ReadProblem }

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
  /** The boards bought as whole sheets, with their sheet; absent when all are bought cut to size. */
  boardSheets?: BoardSheets
  /** How the carcass is joined, for the hardware list; absent means plain screws. */
  joints?: JointType
  /** What each board is made of; absent when none is set (chipboard). */
  boardMaterials?: BoardMaterials
  /** Boards with a grain, whose parts the cut list gives grain-first; absent when none has. */
  grainedBoards?: BoardKey[]
  /** Spacing of the shelf-pin holes adjustable shelves sit on, in mm. */
  holePitch: number
  /** The colour of each board's parts; absent when none is set. A part's own colour wins. */
  boardColors?: BoardColors
  /** The colour of each board's edge banding; absent when none is set (the edges look like the board). */
  edgeColors?: BoardColors
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

/**
 * A design as the app keeps it while it's open: every setting there, the
 * defaults too. A save holds the same, minus whatever is at its default.
 */
export type Design = {
  pieces: Piece[]
  /** Carcasses whose panels (tagged with `boxId`) live in `pieces`. */
  boxes: Box[]
  thickness: Thickness
  /** What each board is, for the cut list. */
  boardNames: BoardNames
  /** What each board is made of; a board without one is chipboard. */
  boardMaterials: BoardMaterials
  /** The boards bought as whole sheets, with their sheet; the rest are bought cut to size. */
  boardSheets: BoardSheets
  /** How the carcass is joined, for the hardware list. */
  joints: JointType
  /** Boards with a grain, in the order of `BOARDS`. */
  grainedBoards: BoardKey[]
  /** Spacing of the shelf-pin holes in sides and dividers; adjustable shelves sit on them. */
  holePitch: number
  /** The colour of each board's parts, unless a part has its own. */
  boardColors: BoardColors
  /** The colour of each board's edge banding, where it shows. */
  edgeColors: BoardColors
  /** How deep new parts start. */
  unitDepth: number
  /** Colour new parts start with; null means the standard look. */
  defaultColor: string | null
  /** Which walls have units on them, and the room's size. */
  room: Room
}

/** A design with no parts and every setting at its default. */
export const newDesign = (): Design => ({
  pieces: [],
  boxes: [],
  thickness: DEFAULT_THICKNESS,
  boardNames: {},
  boardMaterials: {},
  boardSheets: {},
  joints: 'screws',
  grainedBoards: [],
  holePitch: DEFAULT_HOLE_PITCH,
  boardColors: {},
  edgeColors: {},
  unitDepth: DEFAULT_UNIT_DEPTH,
  defaultColor: null,
  room: DEFAULT_ROOM,
})

/** Every key of a `Design`. */
export const DESIGN_KEYS = Object.keys(newDesign()) as (keyof Design)[]

/**
 * A whole design from some of it, such as a save that leaves out settings at
 * their default: whatever is missing or undefined is at its default.
 */
export function designOf(values: Partial<Design>): Design {
  const design = newDesign()
  for (const key of DESIGN_KEYS) {
    if (values[key] !== undefined) Object.assign(design, { [key]: values[key] })
  }
  return design
}

/** A design to save, with what it needs; anything left out is at its default. */
export function toProjectData(design: Partial<Design> & Pick<Design, 'pieces' | 'thickness'>, name?: string): ProjectData {
  return {
    formatVersion: FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    ...(name ? { name } : {}),
    ...compact(designOf(design)),
  }
}

/**
 * A design as a save holds it: settings at their default are left out, so a
 * save only says what was changed. The keys go in the same order every time.
 */
function compact(design: Design) {
  const { boardNames, boardMaterials, boardSheets, joints, grainedBoards, boardColors, edgeColors, defaultColor } = design
  const any = (map: object) => Object.keys(map).length > 0
  return {
    thickness: design.thickness,
    ...(any(boardNames) ? { boardNames } : {}),
    ...(any(boardMaterials) ? { boardMaterials } : {}),
    ...(any(boardSheets) ? { boardSheets } : {}),
    ...(joints !== 'screws' ? { joints } : {}),
    ...(grainedBoards.length > 0 ? { grainedBoards } : {}),
    holePitch: design.holePitch,
    ...(any(boardColors) ? { boardColors } : {}),
    ...(any(edgeColors) ? { edgeColors } : {}),
    unitDepth: design.unitDepth,
    pieces: design.pieces,
    boxes: design.boxes,
    ...(defaultColor ? { defaultColor } : {}),
    room: design.room,
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

/**
 * Whether a design about to be saved would open again with nothing lost.
 * `readProject` drops broken parts rather than failing, so a design holding
 * one (a NaN size from a bug) would otherwise save, and the part vanish on
 * the next load: autosave must never write that over the last good save.
 */
export function opensIntact(data: ProjectData) {
  const result = readProject(data)
  if (!result.ok) return false
  const ids = (list: { id: string }[]) => list.map((item) => item.id).sort().join('\n')
  return ids(result.project.pieces) === ids(data.pieces) && ids(result.project.boxes) === ids(data.boxes)
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
  // Refused rather than cut short, so nothing in it is lost by autosave.
  if (data.pieces.length > MAX_PIECES) return null

  const stored = isRecord(data.thickness) ? data.thickness : {}
  const board = (value: unknown) => {
    const mm = positive(value)
    return mm === undefined ? undefined : Math.min(MAX_THICKNESS, mm)
  }
  const body = board(stored.body) ?? DEFAULT_THICKNESS.body
  // Fronts and drawer boxes were body board until they had their own.
  const thickness: Thickness = {
    body,
    back: board(stored.back) ?? DEFAULT_THICKNESS.back,
    front: board(stored.front) ?? body,
    drawer: board(stored.drawer) ?? body,
  }
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
    const door = {
      double: raw.double === true,
      hinge,
      inset: raw.inset === true,
      // Checked against the angles hinges come in by `normalizePiece`.
      openAngle: typeof raw.openAngle === 'number' ? raw.openAngle : undefined,
      softClose: raw.softClose === true,
      // Checked against the panel counts and overlaps allowed by `normalizePiece`.
      lift: raw.lift === true,
      accessory: typeof raw.accessory === 'string' ? (raw.accessory as AccessoryType) : undefined,
      pane: raw.pane === 'glass' || raw.pane === 'mirror' ? (raw.pane as PaneType) : undefined,
      sliding: typeof raw.sliding === 'number' ? raw.sliding : undefined,
      overlap: typeof raw.overlap === 'number' ? raw.overlap : undefined,
    }
    const drawer = {
      extension: raw.extension === 'full' ? ('full' as const) : undefined,
      overlay: raw.overlay === true,
      close: raw.close === 'soft' || raw.close === 'push' ? (raw.close as 'soft' | 'push') : undefined,
    }
    // Checked against the part's own board in `normalizePiece`.
    const finish = {
      bands: Array.isArray(raw.bands) ? raw.bands.filter(isEdge) : undefined,
      grain: isDimension(raw.grain) ? raw.grain : undefined,
    }
    // Which handle types are allowed where is checked by `normalizePiece`.
    const handle = {
      noHandle: raw.noHandle === true,
      handle: typeof raw.handle === 'string' ? (raw.handle as HandleType) : undefined,
    }
    const z = typeof raw.z === 'number' ? raw.z : undefined
    const extras = { ...handle, fixed: raw.fixed === true, railAt, boxId, color, wall, z, ...door, ...drawer, ...finish }
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
      ...(typeof raw.z === 'number' ? { z: raw.z } : {}),
    }
    return [normalizeBox(box, thickness)]
  })

  // Ids pick out what a selection, a move or a delete acts on, and key what's
  // drawn, so a hand-edited save can't have two of one: the first is kept. A
  // box's panels are named after it, and win over a loose part with the same id.
  const uniqueBoxes = firstOfEach(boxes)
  const built = withBoxPanels(firstOfEach(pieces), uniqueBoxes, thickness)
  const panelIds = new Set(built.filter((piece) => piece.boxId).map((piece) => piece.id))
  const allPieces = firstOfEach(built.filter((piece) => piece.boxId || !panelIds.has(piece.id)))

  const storedRoom = isRecord(data.room) ? data.room : {}
  // A wall with parts on it is always on, so no part can end up on a wall
  // that isn't shown.
  const used = new Set([...allPieces, ...uniqueBoxes].map(wallOf))
  const room: Room = {
    left: storedRoom.left === true || used.has('left'),
    right: storedRoom.right === true || used.has('right'),
    width: clampRoomSize(positive(storedRoom.width) ?? DEFAULT_ROOM.width),
    depth: clampRoomSize(positive(storedRoom.depth) ?? DEFAULT_ROOM.depth),
    ...(positive(storedRoom.height) ? { height: clampRoomSize(positive(storedRoom.height)!) } : {}),
  }

  return {
    formatVersion: FORMAT_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    ...(typeof data.name === 'string' && data.name.trim() ? { name: data.name.trim() } : {}),
    ...compact({
      pieces: allPieces,
      boxes: uniqueBoxes,
      thickness,
      boardNames: readBoardNames(data.boardNames),
      boardMaterials: readBoardMaterials(data.boardMaterials),
      boardSheets: readBoardSheets(data.boardSheets),
      joints: data.joints === 'confirmat' || data.joints === 'cam' ? data.joints : 'screws',
      grainedBoards: readGrainedBoards(data.grainedBoards),
      holePitch: clampHolePitch(positive(data.holePitch) ?? DEFAULT_HOLE_PITCH),
      boardColors: readBoardColors(data.boardColors),
      edgeColors: readBoardColors(data.edgeColors),
      unitDepth: clampUnitDepth(positive(data.unitDepth) ?? DEFAULT_UNIT_DEPTH),
      defaultColor: isHexColor(data.defaultColor) ? data.defaultColor : null,
      room,
    }),
  }
}

/** Each known board's entry that `clean` keeps (it returns undefined to drop one). */
function readBoardMap<T>(value: unknown, clean: (entry: unknown) => T | undefined): Partial<Record<BoardKey, T>> {
  if (!isRecord(value)) return {}
  const map: Partial<Record<BoardKey, T>> = {}
  for (const { key } of BOARDS) {
    const entry = clean(value[key])
    if (entry !== undefined) map[key] = entry
  }
  return map
}

/** Board names worth keeping: known boards, trimmed, not empty, not too long. */
const readBoardNames = (value: unknown): BoardNames => readBoardMap(value, (name) => cleanBoardName(name) ?? undefined)

/** Board sheets worth keeping: known boards, each with a sheet of sizes that make sense. */
const readBoardSheets = (value: unknown): BoardSheets =>
  readBoardMap(value, (sheet) =>
    isRecord(sheet) && positive(sheet.length) && positive(sheet.width)
      ? cleanSheet({
          length: sheet.length as number,
          width: sheet.width as number,
          kerf: typeof sheet.kerf === 'number' ? sheet.kerf : DEFAULT_KERF,
        })
      : undefined,
  )

/** Board materials worth keeping: known boards and materials; chipboard (the default) is stored as nothing. */
const readBoardMaterials = (value: unknown): BoardMaterials =>
  readBoardMap(value, (material) => (isMaterial(material) && material !== 'chipboard' ? material : undefined))

/** Board colours worth keeping: known boards, `#rrggbb` only. */
const readBoardColors = (value: unknown): BoardColors =>
  readBoardMap(value, (color) => (isHexColor(color) ? color : undefined))

/** Boards with a grain: known boards, each once, in the order of `BOARDS`. */
function readGrainedBoards(value: unknown): BoardKey[] {
  if (!Array.isArray(value)) return []
  return BOARDS.map((board) => board.key).filter((key) => value.includes(key))
}

/** A board name as it's kept, or null for none. */
export function cleanBoardName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().slice(0, MAX_BOARD_NAME).trim()
  return name || null
}

/** The list with only the first item of each id. */
function firstOfEach<T extends { id: string }>(list: T[]) {
  const seen = new Set<string>()
  return list.filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)))
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// `Object.hasOwn`, not `in`: `in` also accepts inherited names such as
// `__proto__` or `toString`, which a hand-edited save could use as a kind and
// crash the app on every load.
const isMaterial = (value: unknown): value is BoardMaterial =>
  typeof value === 'string' && Object.hasOwn(MATERIAL_LABELS, value)

const isKind = (value: unknown): value is PieceKind =>
  typeof value === 'string' && Object.hasOwn(KINDS, value)

const positive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

export const clampUnitDepth = (mm: number) =>
  Math.min(MAX_UNIT_DEPTH, Math.max(MIN_UNIT_DEPTH, Math.round(mm)))
