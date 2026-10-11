import type { Wall } from '../types'
import { type CutListGroup, type HardwareRow, CUT_LIST_SECTIONS, bandingTotals, cutList, hardwareList } from './cutList'
import type { Design } from './project'
import { hasSideWalls, wallRuns } from './room'
import { type BoardLayout, layoutSheets } from './sheets'

/** One list in the report: the whole design's, or one wall's (with its `wall` and `label`). */
export type CutListRun = {
  wall?: Wall
  label?: string
  groups: CutListGroup[]
  banding: ReturnType<typeof bandingTotals>
  hardware: HardwareRow[]
}

/**
 * Everything the cut list shows, worked out once: the boards, edge banding
 * and hardware as one list, or (`byWall`, in a room with side walls) one list
 * per wall; the sheet layouts, always for the whole design since sheets are
 * cut from whole boards; and the totals.
 */
export function cutListReport(
  design: Pick<Design, 'pieces' | 'thickness' | 'grainedBoards' | 'joints' | 'boardSheets' | 'room'>,
  byWall: boolean,
) {
  const { pieces, thickness, grainedBoards, joints, boardSheets, room } = design
  const run = (parts: typeof pieces): CutListRun => {
    const groups = cutList(parts, thickness, grainedBoards)
    return { groups, banding: bandingTotals(groups), hardware: hardwareList(parts, thickness, joints) }
  }
  const whole = run(pieces)
  const split = byWall && hasSideWalls(room)
  const runs = split ? wallRuns(pieces, room).map(({ wall, label, pieces: parts }) => ({ wall, label, ...run(parts) })) : [whole]
  const rows = whole.groups.flatMap((group) => group.rows)
  const layouts: BoardLayout[] = layoutSheets(rows, boardSheets)
  return {
    whole,
    runs,
    byWall: split,
    layouts,
    totals: {
      boards: rows.reduce((sum, row) => sum + row.quantity, 0),
      sheets: layouts.reduce((sum, layout) => sum + layout.sheets.length, 0),
      banding: whole.banding.reduce((sum, board) => sum + board.length, 0),
      hardware: whole.hardware.length,
    },
  }
}

export type CutListReport = ReturnType<typeof cutListReport>

/** A group's heading: its section, or for drawers how many (their front's size goes after it). */
export const groupName = (group: CutListGroup) =>
  group.drawers
    ? group.drawers.count === 1
      ? 'Drawer'
      : `${group.drawers.count} drawers`
    : (CUT_LIST_SECTIONS.find((section) => section.id === group.section)?.title ?? '')
