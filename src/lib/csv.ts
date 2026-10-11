import type { BoardKey } from '../types'
import { type CutListGroup, type HardwareRow, describeHardware } from './cutList'
import { groupName } from './cutListReport'

/**
 * Rows as CSV text, as spreadsheets and cutting optimisers read it: commas
 * between fields, CRLF between rows, and a field quoted (with quotes
 * doubled) when it holds a comma, quote or line break. It starts with a byte
 * order mark so Excel reads it as UTF-8 (for ⌀, ° and names in any language).
 *
 * Text starting with = + - @, a tab or a carriage return gets a ' in front:
 * spreadsheets run such a cell as a formula even when it's quoted, so a board
 * named `=HYPERLINK(…)` in a shared project file could otherwise run in Excel.
 * Numbers are left alone, so negative ones stay numbers.
 */
export function toCsv(rows: (string | number)[][]) {
  const field = (value: string | number) => {
    const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value)
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
      ? `${groupName(group)}, front ${num(group.drawers.width)} × ${num(group.drawers.height)}`
      : groupName(group)
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
 * Lists as CSV rows, with the wall each row is for as the first column when
 * they're a room's lists for each wall (each with its `label`).
 */
function byWall<Run extends { label?: string }>(runs: Run[], header: string[], rows: (run: Run) => (string | number)[][]) {
  const walls = runs.some((run) => run.label !== undefined)
  return toCsv([
    walls ? ['Wall', ...header] : header,
    ...runs.flatMap((run) => rows(run).map((row) => (walls ? [run.label ?? '', ...row] : row))),
  ])
}

/**
 * The cut list as CSV rows, one per row of the panel: which section or drawer
 * it's in, the part, how many, its size, its board, whether the grain runs
 * along its length, and how many of its edges along the length and along the
 * width are banded.
 */
export function cutListCsv(runs: { label?: string; groups: CutListGroup[] }[], format: CutListFormat) {
  return byWall(runs, CUT_LIST_HEADER(format.unit), (run) => cutListRows(run.groups, format))
}

/** The hardware list as CSV rows: what to buy, how many, and in what (pairs or pieces). */
export function hardwareCsv(runs: { label?: string; hardware: HardwareRow[] }[], len: (mm: number) => string) {
  return byWall(runs, ['Item', 'Quantity', 'Unit'], (run) =>
    run.hardware.map((row) => {
      const { name, unit } = describeHardware(row, len)
      return [name, row.quantity, unit]
    }),
  )
}
