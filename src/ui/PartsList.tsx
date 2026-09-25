import { pieceLabel } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { hasModifier } from './shortcuts'
import { useClashes } from './useClashes'

/**
 * Every part in the design. Clicking one selects it, which also works for
 * parts that are hard to reach on the canvas (tiny, or covered by others).
 */
export function PartsList() {
  const pieces = useDesignStore((s) => s.pieces)
  const select = useDesignStore((s) => s.select)
  const toggleSelect = useDesignStore((s) => s.toggleSelect)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const clashes = useClashes()

  if (pieces.length === 0) return <p className="muted">No parts yet.</p>

  return (
    <>
      {clashes.size > 0 && (
        <p className="hint hint-error">
          {clashes.size} parts overlap each other (shown in red). Move or resize them so they
          only touch.
        </p>
      )}
      <ul className="parts-list">
        {pieces.map((piece) => (
          <li key={piece.id}>
            <button
              type="button"
              className={[
                'part-row',
                selectedIds.includes(piece.id) && 'part-row-selected',
                clashes.has(piece.id) && 'part-row-clash',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={selectedIds.includes(piece.id)}
              // ⌘/Ctrl-click adds to the selection, like on the canvas.
              onClick={(event) => (hasModifier(event) ? toggleSelect(piece.id) : select(piece.id))}
            >
              <span>{pieceLabel(piece)}</span>
              <span className="part-size">
                {piece.kind === 'rod'
                  ? `⌀${piece.height} × ${piece.width}`
                  : `${piece.width} × ${piece.height} × ${piece.depth}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
