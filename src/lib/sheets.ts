import type { BoardKey, BoardMaterial, BoardSheets, SheetSetup } from '../types'
import { BOARDS } from './defaults'
import type { CutListRow } from './cutList'

/** The saw cut a panel saw takes, in mm, until it's set. */
export const DEFAULT_KERF = 3

/** The usual full sheet of each material, in mm, with a 3 mm saw cut. */
export const DEFAULT_SHEETS: Record<BoardMaterial, SheetSetup> = {
  chipboard: { length: 2800, width: 2070, kerf: DEFAULT_KERF },
  mdf: { length: 2440, width: 1220, kerf: DEFAULT_KERF },
  plywood: { length: 2440, width: 1220, kerf: DEFAULT_KERF },
  solid: { length: 2440, width: 1220, kerf: DEFAULT_KERF },
}

const MIN_SHEET_SIZE = 100
const MAX_SHEET_SIZE = 10000
const MAX_KERF = 20

const whole = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value) || min))

/** A sheet setup kept to sizes that make sense, in whole mm. */
export function cleanSheet(sheet: SheetSetup): SheetSetup {
  return {
    length: whole(sheet.length, MIN_SHEET_SIZE, MAX_SHEET_SIZE),
    width: whole(sheet.width, MIN_SHEET_SIZE, MAX_SHEET_SIZE),
    kerf: whole(sheet.kerf, 0, MAX_KERF),
  }
}

/** A part placed on a sheet: `x` along the sheet's length and `y` along its width, with the size as it lies there. */
type PlacedPart = {
  label: string
  x: number
  y: number
  /** Size along the sheet's length. */
  length: number
  /** Size along the sheet's width. */
  width: number
  /** Turned a quarter turn from the cut list's size (never on a board with grain). */
  turned: boolean
}

export type Sheet = { parts: PlacedPart[] }

export type BoardLayout = {
  board: BoardKey
  setup: SheetSetup
  sheets: Sheet[]
  /** Parts too big for the sheet in any way they may be turned. */
  oversize: { label: string; length: number; width: number }[]
  /** Share of the sheets' area that isn't parts, 0 to 1. */
  waste: number
}

type Free = { x: number; y: number; w: number; h: number }
type Part = { label: string; length: number; width: number; grain: boolean }

/**
 * How the parts of each board that's bought as whole sheets fit onto them,
 * in the order of `BOARDS`; boards without a sheet setup (bought cut to size)
 * are left out. A guillotine layout, as a panel saw makes: every cut runs
 * from one edge to the other. Parts go biggest first into the free space they
 * fit most tightly, opening a new sheet when none has room. The grain runs
 * along the sheet's length, so a part on a board with grain is never turned,
 * and the saw cut (`kerf`) is left between neighbours. Good rather than best.
 */
export function layoutSheets(rows: CutListRow[], sheets: BoardSheets): BoardLayout[] {
  return BOARDS.flatMap(({ key }): BoardLayout[] => {
    const setup = sheets[key]
    if (!setup) return []
    const parts: Part[] = rows
      .filter((row) => row.board === key)
      .flatMap((row) =>
        Array.from({ length: row.quantity }, () => ({
          label: row.label,
          length: row.length,
          width: row.width,
          grain: row.grain,
        })),
      )
      .sort((a, b) => b.length * b.width - a.length * a.width)
    return [layoutBoard(key, setup, parts)]
  })
}

function layoutBoard(board: BoardKey, setup: SheetSetup, parts: Part[]): BoardLayout {
  const open: { free: Free[]; sheet: Sheet }[] = []
  const oversize: BoardLayout['oversize'] = []
  const newSheet = () => {
    const entry = { free: [{ x: 0, y: 0, w: setup.length, h: setup.width }], sheet: { parts: [] } as Sheet }
    open.push(entry)
    return entry
  }

  for (const part of parts) {
    // A part can lie either way unless it has grain; the cut list's length is along the grain.
    const ways = part.grain
      ? [{ length: part.length, width: part.width, turned: false }]
      : [
          { length: part.length, width: part.width, turned: false },
          { length: part.width, width: part.length, turned: true },
        ]
    const fits = ways.filter((way) => way.length <= setup.length && way.width <= setup.width)
    if (fits.length === 0) {
      oversize.push({ label: part.label, length: part.length, width: part.width })
      continue
    }

    const best = (entries: typeof open) => {
      let found: { entry: (typeof open)[number]; free: Free; way: (typeof ways)[number]; score: number } | null = null
      for (const entry of entries) {
        for (const free of entry.free) {
          for (const way of fits) {
            if (way.length > free.w || way.width > free.h) continue
            // Best short side fit: the tightest of the two gaps left over.
            const score = Math.min(free.w - way.length, free.h - way.width)
            if (!found || score < found.score) found = { entry, free, way, score }
          }
        }
      }
      return found
    }
    const placement = best(open) ?? best([newSheet()])!
    const { entry, free, way } = placement
    entry.sheet.parts.push({ label: part.label, x: free.x, y: free.y, ...way })
    entry.free.splice(entry.free.indexOf(free), 1)
    entry.free.push(...split(free, way, setup.kerf))
  }

  const sheets = open.map((entry) => entry.sheet)
  const area = sheets.length * setup.length * setup.width
  const used = sheets.reduce((sum, sheet) => sum + sheet.parts.reduce((s, p) => s + p.length * p.width, 0), 0)
  return { board, setup, sheets, oversize, waste: area === 0 ? 0 : 1 - used / area }
}

/**
 * The free space left in a rectangle after a part takes its top left corner:
 * two rectangles divided by a cut through the shorter leftover side, so the
 * longer leftover stays in one piece. A saw cut's width is lost along each cut.
 */
function split(free: Free, part: { length: number; width: number }, kerf: number): Free[] {
  const rightW = free.w - part.length - kerf
  const belowH = free.h - part.width - kerf
  const wide = free.w - part.length < free.h - part.width
  const right: Free = {
    x: free.x + part.length + kerf,
    y: free.y,
    w: rightW,
    h: wide ? part.width : free.h,
  }
  const below: Free = {
    x: free.x,
    y: free.y + part.width + kerf,
    w: wide ? free.w : part.length,
    h: belowH,
  }
  return [right, below].filter((rect) => rect.w > 0 && rect.h > 0)
}
