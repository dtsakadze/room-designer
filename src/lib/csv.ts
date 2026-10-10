import type { BoardKey } from '../types'
import { CUT_LIST_SECTIONS, type CutListGroup, type HardwareRow, describeHardware } from './cutList'

/**
 * Rows as CSV text, as spreadsheets and cutting optimisers read it: commas
 * between fields, CRLF between rows, and a field quoted (with quotes
 * doubled) when it holds a comma, quote or line break. It starts with a byte
 * order mark so Excel reads it as UTF-8 (for ⌀, ° and names in any language).
 */
export function toCsv(rows: (string | number)[][]) {
  const field = (value: string | number) => {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return `﻿${rows.map((row) => row.map(field).join(',')).join('\r\n')}\r\n`
}

/** How to show the cut list's sizes and boards, as the panel does. */
type CutListFormat = {
  /** A length as a bare number in the project's units. */
  num: (mm: number) => string
  /** The units' name, for the column headings. */
  unit: string
  boardName: (board: BoardKey) => string
}

const CUT_LIST_HEADER = (unit: string) => [
  'Section',
  'Part',
  'Quantity',
  `Length (${unit})`,
  `Width (${unit})`,
  `Thickness (${unit})`,
  'Board',
  'Grain along length',
  'Banded length edges',
  'Banded width edges',
]

function cutListRows(groups: CutListGroup[], { num, boardName }: CutListFormat) {
  return groups.flatMap((group) => {
    const section = group.drawers
      ? `${group.drawers.count === 1 ? 'Drawer' : `${group.drawers.count} drawers`}, front ${num(group.drawers.width)} × ${num(group.drawers.height)}`
      : (CUT_LIST_SECTIONS.find((candidate) => candidate.id === group.section)?.title ?? '')
    return group.rows.map((row) => [
      section,
      row.label,
      row.quantity,
      num(row.length),
      num(row.width),
      num(row.thickness),
      boardName(row.board),
      row.grain ? 'Yes' : 'No',
      row.bands.length,
      row.bands.width,
    ])
  })
}

/**
 * The cut list as CSV rows, one per row of the panel: which section or drawer
 * it's in, the part, how many, its size, its board, whether the grain runs
 * along its length, and how many of its edges along the length and along the
 * width are banded.
 */
export function cutListCsv(groups: CutListGroup[], format: CutListFormat) {
  return toCsv([CUT_LIST_HEADER(format.unit), ...cutListRows(groups, format)])
}

/** The cut list of a room with several walls, with the wall each row is for as its first column. */
export function cutListCsvByWall(runs: { label: string; groups: CutListGroup[] }[], format: CutListFormat) {
  return toCsv([
    ['Wall', ...CUT_LIST_HEADER(format.unit)],
    ...runs.flatMap((run) => cutListRows(run.groups, format).map((row) => [run.label, ...row])),
  ])
}

/** The hardware list as CSV rows: what to buy, how many, and in what (pairs or pieces). */
export function hardwareCsv(rows: HardwareRow[], len: (mm: number) => string) {
  return toCsv([
    ['Item', 'Quantity', 'Unit'],
    ...rows.map((row) => {
      const { name, unit } = describeHardware(row, len)
      return [name, row.quantity, unit]
    }),
  ])
}

/** The hardware list of a room with several walls, with the wall as the first column. */
export function hardwareCsvByWall(runs: { label: string; rows: HardwareRow[] }[], len: (mm: number) => string) {
  return toCsv([
    ['Wall', 'Item', 'Quantity', 'Unit'],
    ...runs.flatMap((run) =>
      run.rows.map((row) => {
        const { name, unit } = describeHardware(row, len)
        return [run.label, name, row.quantity, unit]
      }),
    ),
  ])
}
