import { useDialog } from './useDialog'
import { type CutListRow, describeHardware } from '../lib/cutList'
import { type CutListReport, type CutListRun, groupName } from '../lib/cutListReport'
import { boardName } from '../lib/defaults'
import { SheetLayouts } from './SheetLayouts'
import { UNITS } from '../lib/units'
import { cutListCsv, hardwareCsv } from '../lib/csv'
import { downloadFile, fileBase } from '../lib/projectFile'
import { useDesignStore } from '../store/useDesignStore'
import { useLayoutStore } from '../store/useLayoutStore'
import { useProjectsStore } from '../store/useProjectsStore'
import { useSettingsStore, useUnits } from '../store/useSettingsStore'
import { PRINT_SHORTCUT } from './shortcuts'
import { hasSideWalls } from '../lib/room'
import type { BoardKey } from '../types'
import { useCutListReport } from './useCutListReport'

/**
 * The cut list as a full view over the drawing: totals at the top, the boards
 * as the main table with banding and hardware beside it, and the sheet
 * layouts drawn large below. Escape or × goes back to the drawing.
 */
export function CutListPanel({ onClose }: { onClose: () => void }) {
  const hasParts = useDesignStore((s) => s.pieces.length > 0)
  const report = useCutListReport()
  const sideWalls = useDesignStore((s) => hasSideWalls(s.room))
  const byWall = useSettingsStore((s) => s.cutListByWall)
  const setByWall = useSettingsStore((s) => s.setCutListByWall)
  const { len } = useUnits()

  // Beside the drawing rather than over a dimmed page, so not modal.
  const dialog = useDialog<HTMLDivElement>(onClose, { modal: false })

  const { boards: total, sheets, banding, hardware } = report.totals
  const totals = [
    `${total} board${total === 1 ? '' : 's'} to cut`,
    sheets > 0 && `${sheets} sheet${sheets === 1 ? '' : 's'}`,
    banding > 0 && `${len(banding)} edge banding`,
    hardware > 0 && `${hardware} hardware item${hardware === 1 ? '' : 's'}`,
  ].filter(Boolean)

  return (
    // A dialog, so Escape closes it rather than deselecting (see the canvas's keys).
    <div className="cut-list cut-list-view" role="dialog" aria-label="Cut list" ref={dialog}>
      <header className="cut-list-view-header">
        <div className="cut-list-view-title">
          <h2>Cut list</h2>
          <p className="muted">{totals.join(' · ')}</p>
        </div>
        <div className="cut-list-view-actions">
          {sideWalls && (
            <span className="unit-switch" role="radiogroup" aria-label="List">
              {[
                ['Whole room', false],
                ['By wall', true],
              ].map(([text, value]) => (
                <button
                  key={String(text)}
                  type="button"
                  role="radio"
                  aria-checked={byWall === value}
                  title={value ? 'A list for each wall of the room, to build one run at a time' : undefined}
                  onClick={() => setByWall(value as boolean)}
                >
                  {String(text)}
                </button>
              ))}
            </span>
          )}
          {report.whole.groups.length > 0 && <CsvButtons report={report} />}
          <button
            type="button"
            className="ghost-button"
            disabled={!hasParts}
            title={`Print drawings and the cut list, or save them as a PDF (${PRINT_SHORTCUT})`}
            // The print dialog belongs to the sidebar, which also opens it on ⌘P.
            onClick={() => useLayoutStore.getState().setPrintOpen(true)}
          >
            Print…
          </button>
          <button type="button" className="icon-button" aria-label="Close cut list" title="Back to the drawing (Esc)" onClick={onClose}>
            ×
          </button>
        </div>
      </header>

      <div className="cut-list-view-body">
        <CutListTables report={report} />
      </div>
    </div>
  )
}

/**
 * Downloads the cut list or the hardware list as CSV, in the project's units,
 * for a spreadsheet, a board shop or a cutting optimiser.
 */
function CsvButtons({ report }: { report: CutListReport }) {
  const boardNames = useDesignStore((s) => s.boardNames)
  const project = useProjectsStore(
    (s) => s.projects.find((candidate) => candidate.id === s.currentId)?.name,
  )
  const { num, len, unit } = useUnits()
  const base = fileBase(project) || 'boardcut'
  const hardware = report.whole.hardware

  const downloadCutList = () => {
    const format = { num, unit: UNITS[unit].label, boardName: (board: BoardKey) => boardName(board, boardNames) }
    downloadFile(cutListCsv(report.runs, format), `${base} cut list.csv`, 'text/csv')
  }

  const downloadHardware = () => {
    downloadFile(hardwareCsv(report.runs, len), `${base} hardware.csv`, 'text/csv')
  }

  return (
    <div className="csv-buttons">
      <button type="button" className="ghost-button" title="Download the cut list as CSV, for a spreadsheet or a board shop" onClick={downloadCutList}>
        Cut list CSV
      </button>
      <button
        type="button"
        className="ghost-button"
        title="Download the hardware list as CSV"
        disabled={hardware.length === 0}
        onClick={downloadHardware}
      >
        Hardware CSV
      </button>
    </div>
  )
}

/**
 * The cut list itself: the boards by section, how much edge banding each
 * board needs, and the hardware, with a note on how to read them. In a room
 * with side walls it can be one list for each wall. Shown in the floating
 * panel and on printed pages.
 */
export function CutListTables({ report }: { report: CutListReport }) {
  const boardNames = useDesignStore((s) => s.boardNames)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const { unit } = useUnits()
  const { groups, banding, hardware } = report.whole

  return (
    <>
      {groups.length === 0 && (
        <p className="muted">No boards yet. Add panels or shelves to see what to cut.</p>
      )}
      {report.byWall ? (
        report.runs.map((run) => (
          <section key={run.wall} className="wall-run">
            <h3 className="wall-heading">{run.label}</h3>
            <RunTables run={run} />
          </section>
        ))
      ) : (
        <RunTables run={report.whole} />
      )}

      <SheetLayouts layouts={report.layouts} boardNames={boardNames} />

      <p className="hint">
        All sizes in {UNITS[unit].label}, finished: edge banding included. Edges: thick sides are
        banded, with the length across{grainedBoards.length > 0 && '; lines show the grain'}.
        {banding.length > 0 && ' Allow extra banding for trimming.'}
        {hardware.some((row) => row.item === 'rod') && ' Rod lengths are what to cut them to.'}
        {hardware.some((row) => row.item === 'j-profile') && ' J-profile lengths are what to cut it to.'}
      </p>
    </>
  )
}

/** The boards, edge banding and hardware of one list: the whole design's, or one wall's. */
function RunTables({ run: { groups, banding, hardware } }: { run: CutListRun }) {
  const boardNames = useDesignStore((s) => s.boardNames)
  const { num, len } = useUnits()

  return (
    <div className="cut-list-run">
    <div className="cut-list-main">
    {groups.length > 0 && (
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th className="num">Qty</th>
            <th className="num">Length</th>
            <th className="num">Width</th>
            <th className="num">Thick.</th>
            <th>Edges</th>
            <th>Board</th>
          </tr>
        </thead>
        {groups.map((group, index) => (
          // One body per group; indexed, since two drawer designs can share a size.
          <tbody key={index}>
            <tr className="cut-list-group">
              <th colSpan={7}>
                {groupName(group)}
                {group.drawers && (
                  <span className="muted">
                    {' '}
                    · front {len(group.drawers.width)} × {len(group.drawers.height)}
                  </span>
                )}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr
                key={`${row.label}|${row.length}|${row.width}|${row.thickness}|${row.bands.length}|${row.bands.width}`}
              >
                <td>{row.label}</td>
                <td className="num">{row.quantity}</td>
                <td className="num">{num(row.length)}</td>
                <td className="num">{num(row.width)}</td>
                <td className="num">{num(row.thickness)}</td>
                <td>
                  <EdgeMark row={row} />
                </td>
                <td>{boardName(row.board, boardNames)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    )}
    </div>

    <div className="cut-list-side">
    {banding.length > 0 && (
      <>
        <h3>Edge banding</h3>
        <table>
          <thead>
            <tr>
              <th>Board</th>
              <th className="num">Length</th>
            </tr>
          </thead>
          <tbody>
            {banding.map((total) => (
              <tr key={total.board}>
                <td>{boardName(total.board, boardNames)}</td>
                <td className="num">{len(total.length)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}

    {hardware.length > 0 && (
      <>
        <h3>Hardware</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
            </tr>
          </thead>
          <tbody>
            {hardware.map((row) => {
              const { name, count } = describeHardware(row, len)
              return (
                <tr key={JSON.stringify(row)}>
                  <td>{name}</td>
                  <td className="num">{count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </>
    )}
    </div>
    </div>
  )
}

/**
 * A board's banded edges as a small sketch: its length runs across, banded
 * edges are drawn thick, and lines show the grain on a board that has one.
 */
function EdgeMark({ row }: { row: CutListRow }) {
  const { length, width } = row.bands
  const w = 28
  const h = 16
  const x = 1.5
  const y = 1.5
  const right = w - 1.5
  const bottom = h - 1.5
  const sides = [
    { banded: length >= 1, x1: x, y1: y, x2: right, y2: y },
    { banded: length >= 2, x1: x, y1: bottom, x2: right, y2: bottom },
    { banded: width >= 1, x1: x, y1: y, x2: x, y2: bottom },
    { banded: width >= 2, x1: right, y1: y, x2: right, y2: bottom },
  ]
  const label =
    length + width === 0
      ? 'No edge banding'
      : `Banded: ${[count(length, 'along the length'), count(width, 'along the width')].filter(Boolean).join(', ')}`
  return (
    <svg className="edge-mark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <title>{row.grain ? `${label}. Grain along the length.` : label}</title>
      {row.grain &&
        [h / 3, (2 * h) / 3].map((lineY) => (
          <line key={lineY} className="edge-mark-grain" x1={x + 4} y1={lineY} x2={right - 4} y2={lineY} />
        ))}
      {sides.map(({ banded, ...line }, index) => (
        <line
          // Fixed order: top, bottom, left, right.
          key={index}
          className={banded ? 'edge-mark-banded' : 'edge-mark-plain'}
          {...line}
        />
      ))}
    </svg>
  )
}

/** "1 edge along the length", "2 edges along the width", or nothing for none. */
const count = (n: number, along: string) =>
  n === 0 ? '' : `${n} edge${n === 1 ? '' : 's'} ${along}`
