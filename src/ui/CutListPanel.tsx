import { cutList } from '../lib/cutList'
import { useDesignStore } from '../store/useDesignStore'

const BOARD_LABELS = { body: 'Body', back: 'Back' } as const

/** The boards to cut, grouped and counted, floating over the canvas. */
export function CutListPanel({ onClose }: { onClose: () => void }) {
  const pieces = useDesignStore((s) => s.pieces)
  const rows = cutList(pieces)
  const total = rows.reduce((sum, row) => sum + row.quantity, 0)
  const skipped = pieces.filter((piece) => piece.kind === 'rod' || piece.kind === 'drawer').length

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

      {rows.length === 0 ? (
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
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}|${row.length}|${row.width}|${row.thickness}`}>
                <td>{row.label}</td>
                <td className="num">{row.quantity}</td>
                <td className="num">{row.length}</td>
                <td className="num">{row.width}</td>
                <td className="num">{row.thickness}</td>
                <td>{BOARD_LABELS[row.board]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="hint">
        All sizes in mm.
        {skipped > 0 &&
          ` Rods and drawers aren't flat boards, so they're left out (${skipped} in the design).`}
      </p>
    </div>
  )
}
