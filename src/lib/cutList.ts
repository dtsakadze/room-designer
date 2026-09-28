import type { Piece, PieceKind, Thickness } from '../types'
import { BOARD, pieceLabel } from './defaults'
import { drawerParts, runnerLength } from './drawer'
import { doorLeaves } from './geometry'

export type CutListRow = {
  kind: PieceKind
  label: string
  quantity: number
  /** The longer of the board's two face sizes, in mm. */
  length: number
  /** The shorter of the board's two face sizes, in mm. */
  width: number
  thickness: number
  board: keyof Thickness
}

type Dimension = 'width' | 'height' | 'depth'

/**
 * One board to cut: its size, which dimension is its thickness, and its name.
 * `order` is where it goes in its section: by kind, or a drawer's part.
 */
type Board = {
  kind: PieceKind
  label: string
  size: Record<Dimension, number>
  axis: Dimension
  board: keyof Thickness
  order: number
}

/** The cut list's sections for the unit's boards, each part kind in its place. */
export const CUT_LIST_SECTIONS = [
  { id: 'panels', title: 'Panels', kinds: ['vertical', 'horizontal', 'back', 'plinth', 'rail'] },
  { id: 'shelves', title: 'Shelves and dividers', kinds: ['shelf', 'divider'] },
  { id: 'doors', title: 'Doors', kinds: ['door'] },
] as const satisfies readonly { id: string; title: string; kinds: readonly PieceKind[] }[]

/** A drawer's boards in the order it's put together. */
const DRAWER_ROLES = ['front', 'side', 'back', 'bottom'] as const

/**
 * Boards that belong together in the cut list: one section of the unit's
 * boards (panels, shelves, doors), or the boards of one drawer design (every
 * drawer whose boards come out the same).
 */
export type CutListGroup =
  | { section: (typeof CUT_LIST_SECTIONS)[number]['id']; drawers: null; rows: CutListRow[] }
  | {
      section: 'drawers'
      /** How many drawers these boards build, and their front's size. */
      drawers: { count: number; width: number; height: number }
      rows: CutListRow[]
    }

/**
 * Every board in the design, as a board shop would want it: length × width ×
 * thickness, with identical parts of the same kind counted together.
 *
 * A board's thickness axis comes from `BOARD`; the other two dimensions are its
 * face, listed longest first. Rods aren't flat boards, so they aren't here. A
 * double door is cut as two leaves, and a drawer as its front, sides, back and
 * bottom.
 *
 * Boards are grouped so a list is easy to check against the design: sections
 * for panels, shelves and dividers, and doors, then a group per drawer design,
 * so it's clear which boards make up a drawer (identical drawers share one,
 * their boards counted together). Within a group, parts of a kind stay
 * together, biggest first.
 */
export function cutList(pieces: Piece[], thickness: Thickness): CutListGroup[] {
  const groups: CutListGroup[] = []
  for (const section of CUT_LIST_SECTIONS) {
    const kinds: readonly PieceKind[] = section.kinds
    const inSection = pieces.filter((piece) => kinds.includes(piece.kind))
    const rows = rowsOf(inSection.flatMap((piece) => boardsOf(piece, thickness)))
    if (rows.length > 0) groups.push({ section: section.id, drawers: null, rows })
  }

  // Drawers whose boards come out the same sizes are one design, in the order
  // the first of each was added.
  const designs = new Map<string, { drawers: Piece[]; boards: Board[] }>()
  for (const drawer of pieces.filter((piece) => piece.kind === 'drawer')) {
    const boards = boardsOf(drawer, thickness)
    const key = JSON.stringify(rowsOf(boards))
    const design = designs.get(key)
    if (design) {
      design.drawers.push(drawer)
      design.boards.push(...boards)
    } else {
      designs.set(key, { drawers: [drawer], boards })
    }
  }
  for (const { drawers, boards } of designs.values()) {
    const [first] = drawers
    groups.push({
      section: 'drawers',
      drawers: { count: drawers.length, width: first.width, height: first.height },
      rows: rowsOf(boards),
    })
  }
  return groups
}

function rowsOf(boards: Board[]): CutListRow[] {
  const rows = new Map<string, CutListRow & { order: number }>()

  for (const board of boards) {
    const [a, b] = (['width', 'height', 'depth'] as const)
      .filter((dimension) => dimension !== board.axis)
      .map((dimension) => board.size[dimension])
    const length = Math.max(a, b)
    const width = Math.min(a, b)
    const cut = board.size[board.axis]

    const key = `${board.label}|${length}|${width}|${cut}`
    const row = rows.get(key)
    if (row) {
      row.quantity += 1
    } else {
      rows.set(key, {
        kind: board.kind,
        label: board.label,
        quantity: 1,
        length,
        width,
        thickness: cut,
        board: board.board,
        order: board.order,
      })
    }
  }

  // Parts of a kind together (a fixed shelf apart from adjustable ones), then
  // biggest first.
  return [...rows.values()]
    .sort(
      (x, y) =>
        x.order - y.order ||
        x.label.localeCompare(y.label) ||
        y.length - x.length ||
        y.width - x.width ||
        y.thickness - x.thickness,
    )
    .map(({ order: _order, ...row }) => row)
}

function boardsOf(piece: Piece, thickness: Thickness): Board[] {
  if (piece.kind === 'drawer') {
    return drawerParts(piece, thickness).map((part) => ({
      kind: piece.kind,
      label: part.label,
      size: part,
      axis: part.axis,
      board: part.board,
      order: DRAWER_ROLES.indexOf(part.role),
    }))
  }
  const board = BOARD[piece.kind]
  if (!board) return []
  const kind = { kind: piece.kind, axis: board.axis, board: board.board, order: kindOrder(piece.kind) }
  if (piece.kind === 'door' && piece.double) {
    // One row per leaf, so "2 × Double door" can't read as two pairs.
    return doorLeaves(piece, true).map((leaf) => ({ ...kind, label: 'Double door leaf', size: leaf }))
  }
  return [{ ...kind, label: pieceLabel(piece), size: piece }]
}

/** Where a kind comes within its cut list section. */
const kindOrder = (kind: PieceKind) =>
  CUT_LIST_SECTIONS.map((section): readonly PieceKind[] => section.kinds)
    .find((kinds) => kinds.includes(kind))
    ?.indexOf(kind) ?? 0

/**
 * Something to buy rather than cut from board: pairs of drawer runners of one
 * type and length, hanging rods of one diameter and length, or the supports
 * that hold rods of one diameter at each end. Sizes in mm.
 */
export type HardwareRow =
  | { item: 'runners'; extension: 'standard' | 'full'; length: number; quantity: number }
  | { item: 'rod'; diameter: number; length: number; quantity: number }
  | { item: 'rod-supports'; diameter: number; quantity: number }

/** Supports a hanging rod needs: one at each end. */
const SUPPORTS_PER_ROD = 2

/**
 * What to buy besides boards, identical items counted together: a pair of
 * runners per drawer (by type and length), each hanging rod (by diameter and
 * the length to cut it to), and its end supports. Drawers too shallow for any
 * runner are left out; the drawer's panel says so. Runners come first, then
 * rods and their supports.
 */
export function hardwareList(pieces: Piece[], thickness: Thickness): HardwareRow[] {
  const rows = new Map<string, HardwareRow>()
  const add = (row: HardwareRow) => {
    const { quantity, ...what } = row
    const key = JSON.stringify(what)
    const existing = rows.get(key)
    if (existing) existing.quantity += quantity
    else rows.set(key, { ...row })
  }

  for (const piece of pieces) {
    if (piece.kind === 'drawer') {
      const length = runnerLength(piece, thickness)
      if (length === null) continue
      add({ item: 'runners', extension: piece.extension ?? 'standard', length, quantity: 1 })
    } else if (piece.kind === 'rod') {
      // A rod's height is its diameter and its width its length.
      add({ item: 'rod', diameter: piece.height, length: piece.width, quantity: 1 })
      add({ item: 'rod-supports', diameter: piece.height, quantity: SUPPORTS_PER_ROD })
    }
  }

  const order = { runners: 0, rod: 1, 'rod-supports': 2 }
  return [...rows.values()].sort(
    (a, b) =>
      order[a.item] - order[b.item] ||
      ('extension' in a && 'extension' in b ? a.extension.localeCompare(b.extension) : 0) ||
      ('diameter' in a && 'diameter' in b ? a.diameter - b.diameter : 0) ||
      ('length' in a && 'length' in b ? b.length - a.length : 0),
  )
}
