import type { Box, Piece, PieceKind, Thickness } from '../types'
import { normalizeBox, withBoxPanels } from './box'
import {
  DEFAULT_THICKNESS,
  DEFAULT_UNIT_DEPTH,
  MAX_UNIT_DEPTH,
  MIN_UNIT_DEPTH,
  PIECE_LABELS,
} from './defaults'
import { isHexColor, normalizePiece } from './geometry'

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
export const FORMAT_VERSION = 2

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
  /** How deep new parts start. */
  unitDepth: number
  pieces: Piece[]
  /** Carcasses; their panels are in `pieces` too, but are rebuilt from these on load. */
  boxes: Box[]
  /** Colour new parts start with. Absent means the standard look. */
  defaultColor?: string
}

export function toProjectData(
  design: {
    pieces: Piece[]
    boxes?: Box[]
    thickness: Thickness
    unitDepth?: number
    defaultColor?: string | null
  },
  name?: string,
): ProjectData {
  return {
    formatVersion: FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    ...(name ? { name } : {}),
    thickness: design.thickness,
    unitDepth: design.unitDepth ?? DEFAULT_UNIT_DEPTH,
    pieces: design.pieces,
    boxes: design.boxes ?? [],
    ...(design.defaultColor ? { defaultColor: design.defaultColor } : {}),
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
  const thickness: Thickness = {
    body: positive(stored.body) ?? DEFAULT_THICKNESS.body,
    back: positive(stored.back) ?? DEFAULT_THICKNESS.back,
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
    const extras = { fixed: raw.fixed === true, railAt, boxId, color }
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
    }
    return [normalizeBox(box, thickness)]
  })

  return {
    formatVersion: FORMAT_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    ...(typeof data.name === 'string' && data.name.trim() ? { name: data.name.trim() } : {}),
    thickness,
    unitDepth: clampUnitDepth(positive(data.unitDepth) ?? DEFAULT_UNIT_DEPTH),
    pieces: withBoxPanels(pieces, boxes, thickness),
    boxes,
    ...(isHexColor(data.defaultColor) ? { defaultColor: data.defaultColor } : {}),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isKind = (value: unknown): value is PieceKind =>
  typeof value === 'string' && value in PIECE_LABELS

const positive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

export const clampUnitDepth = (mm: number) =>
  Math.min(MAX_UNIT_DEPTH, Math.max(MIN_UNIT_DEPTH, Math.round(mm)))
