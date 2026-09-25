import type { Box, Piece, PieceKind, Thickness } from '../types'
import { normalizeBox, withBoxPanels } from './box'
import {
  DEFAULT_THICKNESS,
  DEFAULT_UNIT_DEPTH,
  MAX_UNIT_DEPTH,
  MIN_UNIT_DEPTH,
  PIECE_LABELS,
} from './defaults'
import { normalizePiece } from './geometry'

/**
 * Bump this whenever the saved shape changes, and teach `parseProject` to
 * upgrade the older version, so existing autosaves and files still open.
 */
export const FORMAT_VERSION = 1

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
  /** How deep new parts start. Older saves don't have it, so it's optional here. */
  unitDepth?: number
  pieces: Piece[]
  /** Carcasses; their panels are in `pieces` too, but are rebuilt from these on load. */
  boxes?: Box[]
}

export function toProjectData(
  design: { pieces: Piece[]; boxes?: Box[]; thickness: Thickness; unitDepth?: number },
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
  }
}

/**
 * Reads stored data back into a design, or returns null if it isn't a project
 * this version understands. Stored data can come from an older version or be
 * hand-edited, so nothing is trusted: unknown pieces are dropped and every
 * piece goes through the same normalising as an edit does. A box's panels
 * are rebuilt from the box, so they can't disagree with it.
 */
export function parseProject(data: unknown): ProjectData | null {
  if (!isRecord(data) || data.formatVersion !== FORMAT_VERSION) return null
  if (!Array.isArray(data.pieces)) return null

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
    return [normalizePiece({ ...piece, fixed: raw.fixed === true, railAt, boxId }, thickness)]
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
