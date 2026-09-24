import type { Piece, PieceKind, Thickness } from '../types'
import { DEFAULT_THICKNESS, PIECE_LABELS } from './defaults'
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
  thickness: Thickness
  pieces: Piece[]
}

export function toProjectData(design: { pieces: Piece[]; thickness: Thickness }): ProjectData {
  return {
    formatVersion: FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    thickness: design.thickness,
    pieces: design.pieces,
  }
}

/**
 * Reads stored data back into a design, or returns null if it isn't a project
 * this version understands. Stored data can come from an older version or be
 * hand-edited, so nothing is trusted: unknown pieces are dropped and every
 * piece goes through the same normalising as an edit does.
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
    return [normalizePiece(piece, thickness)]
  })

  return {
    formatVersion: FORMAT_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    thickness,
    pieces,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isKind = (value: unknown): value is PieceKind =>
  typeof value === 'string' && value in PIECE_LABELS

const positive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
