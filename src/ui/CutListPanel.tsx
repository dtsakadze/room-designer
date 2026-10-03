import { useEffect } from 'react'
import {
  CUT_LIST_SECTIONS,
  type CutListRow,
  type HardwareRow,
  bandingTotals,
  cutList,
  hardwareList,
} from '../lib/cutList'
import { CLOSE_LABELS, EXTENSION_LABELS, boardName } from '../lib/defaults'
import { HINGE_FIT_LABELS } from '../lib/hinges'
import { UNITS } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useUnits } from '../store/useSettingsStore'

/** The boards to cut, grouped and counted, floating over the canvas. */
export function CutListPanel({ onClose }: { onClose: () => void }) {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const groups = cutList(pieces, thickness, grainedBoards)

  // Escape closes it, unless a dialog over it (Projects, …) takes the key.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('[role="dialog"]:not(.cut-list)')) return
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  const total = groups
    .flatMap((group) => group.rows)
    .reduce((sum, row) => sum + row.quantity, 0)

  return (
    // A dialog, so Escape closes it rather than deselecting (see the canvas's keys).
    <div className="cut-list" role="dialog" aria-label="Cut list">
      <header className="cut-list-header">
        <h2>Cut list</h2>
        <span className="muted">
          {total} board{total === 1 ? '' : 's'}
        </span>
        <button type="button" className="icon-button" aria-label="Close cut list" onClick={onClose}>
          ×
        </button>
      </header>

      <CutListTables />
    </div>
  )
}

/**
 * The cut list itself: the boards by section, how much edge banding each
 * board needs, and the hardware, with a note on how to read them. Shown in
 * the floating panel and on printed pages.
 */
export function CutListTables() {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const boardNames = useDesignStore((s) => s.boardNames)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const groups = cutList(pieces, thickness, grainedBoards)
  const banding = bandingTotals(groups)
  const hardware = hardwareList(pieces, thickness)
  const { num, len, unit } = useUnits()

  return (
    <>
    {groups.length === 0 ? (
      <p className="muted">No boards yet. Add panels or shelves to see what to cut.</p>
    ) : (
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
                {group.drawers ? (
                  <>
                    {group.drawers.count === 1 ? 'Drawer' : `${group.drawers.count} drawers`}
                    <span className="muted">
                      {' '}
                      · front {len(group.drawers.width)} × {len(group.drawers.height)}
                    </span>
                  </>
                ) : (
                  CUT_LIST_SECTIONS.find((section) => section.id === group.section)?.title
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
              const { name, count } = hardwareText(row, len)
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

    <p className="hint">
      All sizes in {UNITS[unit].label}, finished: edge banding included. Edges: thick sides are
      banded, with the length across{grainedBoards.length > 0 && '; lines show the grain'}.
      {banding.length > 0 && ' Allow extra banding for trimming.'}
      {hardware.some((row) => row.item === 'rod') && ' Rod lengths are what to cut them to.'}
    </p>
    </>
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

/** A hardware row's name and how many, in words: runners come in pairs. */
function hardwareText(row: HardwareRow, len: (mm: number) => string) {
  switch (row.item) {
    case 'runners':
      return {
        name: `Drawer runners, ${EXTENSION_LABELS[row.extension].toLowerCase()}${row.close === 'ordinary' ? '' : `, ${CLOSE_LABELS[row.close].toLowerCase()}`}, ${len(row.length)}`,
        count: `${row.quantity} pair${row.quantity === 1 ? '' : 's'}`,
      }
    case 'hinges':
      return {
        name: `Cup hinges, ${HINGE_FIT_LABELS[row.fit]}, ${row.angle}°${row.softClose ? ', soft-close' : ''}`,
        count: `${row.quantity}`,
      }
    case 'rod':
      return { name: `Hanging rod, ⌀${len(row.diameter)}, ${len(row.length)} long`, count: `${row.quantity}` }
    case 'rod-supports':
      return { name: `Rod end supports, ⌀${len(row.diameter)}`, count: `${row.quantity}` }
    case 'shelf-pins':
      return { name: 'Shelf pins', count: `${row.quantity}` }
    case 'shelf-screws':
      return { name: 'Screws for fixed shelves', count: `${row.quantity}` }
    case 'carcass-screws':
      return { name: 'Carcass screws (tops, bottoms, rails to sides)', count: `${row.quantity}` }
    case 'back-fixings':
      return { name: 'Nails or screws for back panels', count: `${row.quantity}` }
    case 'handles':
      return { name: 'Handles or knobs', count: `${row.quantity}` }
  }
}
