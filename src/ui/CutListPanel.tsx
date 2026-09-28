import { CUT_LIST_SECTIONS, type HardwareRow, cutList, hardwareList } from '../lib/cutList'
import { EXTENSION_LABELS, boardName } from '../lib/defaults'
import { UNITS } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useUnits } from '../store/useSettingsStore'

/** The boards to cut, grouped and counted, floating over the canvas. */
export function CutListPanel({ onClose }: { onClose: () => void }) {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const boardNames = useDesignStore((s) => s.boardNames)
  const groups = cutList(pieces, thickness)
  const hardware = hardwareList(pieces, thickness)
  const { num, len, unit } = useUnits()
  const total = groups
    .flatMap((group) => group.rows)
    .reduce((sum, row) => sum + row.quantity, 0)

  return (
    <div className="cut-list">
      <header className="cut-list-header">
        <h2>Cut list</h2>
        <span className="muted">
          {total} board{total === 1 ? '' : 's'}
        </span>
        <button type="button" className="icon-button" aria-label="Close cut list" onClick={onClose}>
          ×
        </button>
      </header>

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
              <th>Board</th>
            </tr>
          </thead>
          {groups.map((group, index) => (
            // One body per group; indexed, since two drawer designs can share a size.
            <tbody key={index}>
              <tr className="cut-list-group">
                <th colSpan={6}>
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
                <tr key={`${row.label}|${row.length}|${row.width}|${row.thickness}`}>
                  <td>{row.label}</td>
                  <td className="num">{row.quantity}</td>
                  <td className="num">{num(row.length)}</td>
                  <td className="num">{num(row.width)}</td>
                  <td className="num">{num(row.thickness)}</td>
                  <td>{boardName(row.board, boardNames)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
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
        All sizes in {UNITS[unit].label}.
        {hardware.some((row) => row.item === 'rod') && ' Rod lengths are what to cut them to.'}
      </p>
    </div>
  )
}

/** A hardware row's name and how many, in words: runners come in pairs. */
function hardwareText(row: HardwareRow, len: (mm: number) => string) {
  switch (row.item) {
    case 'runners':
      return {
        name: `Drawer runners, ${EXTENSION_LABELS[row.extension].toLowerCase()}, ${len(row.length)}`,
        count: `${row.quantity} pair${row.quantity === 1 ? '' : 's'}`,
      }
    case 'rod':
      return { name: `Hanging rod, ⌀${len(row.diameter)}, ${len(row.length)} long`, count: `${row.quantity}` }
    case 'rod-supports':
      return { name: `Rod end supports, ⌀${len(row.diameter)}`, count: `${row.quantity}` }
  }
}
