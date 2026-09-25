import { pieceLabel } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'

/**
 * Every part in the design. Clicking one selects it, which also works for
 * parts that are hard to reach on the canvas (tiny, or covered by others).
 */
export function PartsList() {
  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const select = useDesignStore((s) => s.select)

  if (pieces.length === 0) return <p className="muted">No parts yet.</p>

  return (
    <ul className="parts-list">
      {pieces.map((piece) => (
        <li key={piece.id}>
          <button
            type="button"
            className={piece.id === selectedId ? 'part-row part-row-selected' : 'part-row'}
            aria-pressed={piece.id === selectedId}
            onClick={() => select(piece.id)}
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
  )
}
