import type { BoardKey, Dimension, Edge, Piece, PieceKind, Thickness } from '../types'
import { BOARD, BOARDS, CLOSE_LABELS, EXTENSION_LABELS, pieceLabel } from './defaults'
import { drawerParts, runnerLength } from './drawer'
import { bandsOf, edgeRunsAlong, faceDimensions, grainOf } from './edges'
import { doorLeaves } from './geometry'
import { backFixings, carcassScrews, handleCount } from './fixings'
import { HINGE_FITS, HINGE_FIT_LABELS, type HingeFit, doorHinges } from './hinges'
import { PINS_PER_SHELF, isAdjustable } from './shelfPins'

export type CutListRow = {
  kind: PieceKind
  label: string
  quantity: number
  /**
   * One of the board's two face sizes, in mm: the one the grain runs along on
   * a board with grain, otherwise the longer one.
   */
  length: number
  /** The other face size, in mm. */
  width: number
  thickness: number
  board: BoardKey
  /** The board has a grain, which runs along `length`. */
  grain: boolean
  /** How many of the board's edges are edge-banded: of the two along its length, and of the two along its width. */
  bands: { length: number; width: number }
}

/**
 * One board to cut: its size, which dimension is its thickness, its banded
 * edges, the way its grain runs, and its name. `order` is where it goes in
 * its section: by kind, or a drawer's part.
 */
type Board = {
  kind: PieceKind
  label: string
  size: Record<Dimension, number>
  axis: Dimension
  board: BoardKey
  bands: Edge[]
  grain: Dimension
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
 * thickness and which edges to band, with identical parts of the same kind
 * counted together.
 *
 * A board's thickness axis comes from `BOARD`; the other two dimensions are its
 * face. On a board with grain (`grained`), length is the size along the grain,
 * as shops read it, so a part can't be cut turned; on others it's the longer
 * size, so the shop can turn parts to fit. Rods aren't flat boards, so they aren't here. A
 * double door is cut as two leaves, and a drawer as its front, sides, back and
 * bottom.
 *
 * Boards are grouped so a list is easy to check against the design: sections
 * for panels, shelves and dividers, and doors, then a group per drawer design,
 * so it's clear which boards make up a drawer (identical drawers share one,
 * their boards counted together). Within a group, parts of a kind stay
 * together, biggest first.
 */
export function cutList(
  pieces: Piece[],
  thickness: Thickness,
  grained: readonly BoardKey[] = [],
): CutListGroup[] {
  const rowsOf = (boards: Board[]) => toRows(boards, grained)
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

function toRows(boards: Board[], grained: readonly BoardKey[]): CutListRow[] {
  const rows = new Map<string, CutListRow & { order: number }>()

  for (const board of boards) {
    const grain = grained.includes(board.board)
    const [a, b] = faceDimensions(board.axis)
    // Which face dimension is the length: the grain's, or the longer.
    const along = grain ? board.grain : board.size[a] >= board.size[b] ? a : b
    const length = board.size[along]
    const width = board.size[along === a ? b : a]
    const cut = board.size[board.axis]
    const long = board.bands.filter((edge) => edgeRunsAlong(edge, board.axis) === along).length
    const bands = { length: long, width: board.bands.length - long }

    const key = `${board.label}|${length}|${width}|${cut}|${bands.length}|${bands.width}`
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
        grain,
        bands,
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
      bands: part.bands,
      grain: part.grain,
      order: DRAWER_ROLES.indexOf(part.role),
    }))
  }
  const board = BOARD[piece.kind]
  if (!board) return []
  const kind = {
    kind: piece.kind,
    axis: board.axis,
    board: board.board,
    bands: bandsOf(piece),
    grain: grainOf(piece)!,
    order: kindOrder(piece.kind),
  }
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
 * How much edge banding each board's parts need, in mm: the length of every
 * banded edge, without anything extra for trimming. Boards needing none are
 * left out; the rest come in the order of `BOARDS`.
 */
export function bandingTotals(groups: CutListGroup[]): { board: BoardKey; length: number }[] {
  const totals = new Map<BoardKey, number>()
  for (const row of groups.flatMap((group) => group.rows)) {
    const length = row.quantity * (row.bands.length * row.length + row.bands.width * row.width)
    if (length > 0) totals.set(row.board, (totals.get(row.board) ?? 0) + length)
  }
  return BOARDS.filter(({ key }) => totals.has(key)).map(({ key }) => ({ board: key, length: totals.get(key)! }))
}

/**
 * Something to buy rather than cut from board: pairs of drawer runners of one
 * type and length, hanging rods of one diameter and length, the supports
 * that hold rods of one diameter at each end, or the pins adjustable shelves
 * rest on, or the screws fixed shelves are held by. Hinges are counted by
 * kind: how they fit, how far they open (degrees) and whether they're
 * soft-close. Sizes in mm.
 */
export type HardwareRow =
  | {
      item: 'runners'
      extension: 'standard' | 'full'
      close: keyof typeof CLOSE_LABELS
      length: number
      quantity: number
    }
  | { item: 'hinges'; fit: HingeFit; angle: number; softClose: boolean; quantity: number }
  | { item: 'rod'; diameter: number; length: number; quantity: number }
  | { item: 'rod-supports'; diameter: number; quantity: number }
  | { item: 'shelf-pins'; quantity: number }
  | { item: 'shelf-screws'; quantity: number }
  | { item: 'carcass-screws'; quantity: number }
  | { item: 'back-fixings'; quantity: number }
  | { item: 'handles'; quantity: number }

/**
 * Screws a fixed shelf needs: two through each side, near its front and back
 * edges, so it holds the sides straight.
 */
const SCREWS_PER_FIXED_SHELF = 4

/** The order runner kinds are listed in, ordinary ones first. */
const CLOSES = Object.keys(CLOSE_LABELS) as (keyof typeof CLOSE_LABELS)[]

/** Supports a hanging rod needs: one at each end. */
const SUPPORTS_PER_ROD = 2

/**
 * What to buy besides boards, identical items counted together: a pair of
 * runners per drawer (by type and length), each door leaf's hinges (by kind,
 * see `doorHinges`), each hanging rod (by diameter and the length to cut it
 * to), its end supports, four pins per adjustable shelf and four screws per
 * fixed one, the screws joining the carcass and fixing its backs (see
 * `fixings.ts`), and a handle per door leaf and drawer that has one. Drawers
 * too shallow for any runner are left out; the drawer's panel says so.
 * Runners come first, then hinges, rods and their supports, shelf pins and
 * screws, carcass fixings, then handles.
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

  for (const { fit, angle, softClose, count } of doorHinges(pieces, thickness)) {
    add({ item: 'hinges', fit, angle, softClose, quantity: count })
  }
  for (const piece of pieces) {
    if (piece.kind === 'drawer') {
      const length = runnerLength(piece, thickness)
      if (length === null) continue
      add({
        item: 'runners',
        extension: piece.extension ?? 'standard',
        close: piece.close ?? 'ordinary',
        length,
        quantity: 1,
      })
    } else if (piece.kind === 'rod') {
      // A rod's height is its diameter and its width its length.
      add({ item: 'rod', diameter: piece.height, length: piece.width, quantity: 1 })
      add({ item: 'rod-supports', diameter: piece.height, quantity: SUPPORTS_PER_ROD })
    } else if (isAdjustable(piece)) {
      add({ item: 'shelf-pins', quantity: PINS_PER_SHELF })
    } else if (piece.kind === 'shelf') {
      add({ item: 'shelf-screws', quantity: SCREWS_PER_FIXED_SHELF })
    }
  }

  const fixings = [
    { item: 'carcass-screws', quantity: carcassScrews(pieces) },
    { item: 'back-fixings', quantity: backFixings(pieces) },
    { item: 'handles', quantity: handleCount(pieces) },
  ] as const
  for (const row of fixings) if (row.quantity > 0) add(row)

  const order = {
    runners: 0,
    hinges: 1,
    rod: 2,
    'rod-supports': 3,
    'shelf-pins': 4,
    'shelf-screws': 5,
    'carcass-screws': 6,
    'back-fixings': 7,
    handles: 8,
  }
  return [...rows.values()].sort(
    (a, b) =>
      order[a.item] - order[b.item] ||
      ('extension' in a && 'extension' in b
        ? a.extension.localeCompare(b.extension) ||
          CLOSES.indexOf(a.close) - CLOSES.indexOf(b.close)
        : 0) ||
      ('fit' in a && 'fit' in b
        ? HINGE_FITS.indexOf(a.fit) - HINGE_FITS.indexOf(b.fit) ||
          a.angle - b.angle ||
          Number(a.softClose) - Number(b.softClose)
        : 0) ||
      ('diameter' in a && 'diameter' in b ? a.diameter - b.diameter : 0) ||
      ('length' in a && 'length' in b ? b.length - a.length : 0),
  )
}

/**
 * A hardware row in words: what it is, and how many, as a number and in a
 * unit to buy it in (runners come in pairs). `len` shows a length in the
 * project's units.
 */
export function describeHardware(row: HardwareRow, len: (mm: number) => string) {
  const each = { unit: 'pcs' }
  switch (row.item) {
    case 'runners':
      return {
        name: `Drawer runners, ${EXTENSION_LABELS[row.extension].toLowerCase()}${row.close === 'ordinary' ? '' : `, ${CLOSE_LABELS[row.close].toLowerCase()}`}, ${len(row.length)}`,
        count: `${row.quantity} pair${row.quantity === 1 ? '' : 's'}`,
        unit: 'pairs',
      }
    case 'hinges':
      return {
        name: `Cup hinges, ${HINGE_FIT_LABELS[row.fit]}, ${row.angle}°${row.softClose ? ', soft-close' : ''}`,
        count: `${row.quantity}`,
        ...each,
      }
    case 'rod':
      return { name: `Hanging rod, ⌀${len(row.diameter)}, ${len(row.length)} long`, count: `${row.quantity}`, ...each }
    case 'rod-supports':
      return { name: `Rod end supports, ⌀${len(row.diameter)}`, count: `${row.quantity}`, ...each }
    case 'shelf-pins':
      return { name: 'Shelf pins', count: `${row.quantity}`, ...each }
    case 'shelf-screws':
      return { name: 'Screws for fixed shelves', count: `${row.quantity}`, ...each }
    case 'carcass-screws':
      return { name: 'Carcass screws (tops, bottoms, rails to sides)', count: `${row.quantity}`, ...each }
    case 'back-fixings':
      return { name: 'Nails or screws for back panels', count: `${row.quantity}`, ...each }
    case 'handles':
      return { name: 'Handles or knobs', count: `${row.quantity}`, ...each }
  }
}
