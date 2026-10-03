import { BOARD } from '../lib/defaults'
import { EDGE_LABELS, GRAIN_LABELS, bandsOf, boardEdges, faceDimensions, grainOf } from '../lib/edges'
import { useDesignStore } from '../store/useDesignStore'
import type { Piece } from '../types'

/**
 * A part's edge banding and, on a board with grain, the way the grain runs.
 * Both start as what its kind usually has; changing them here is for this
 * part alone. A drawer's banding is fixed, but its front's grain can turn.
 */
export function FinishFields({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const board = BOARD[piece.kind]
  const isDrawer = piece.kind === 'drawer'
  if (!board && !isDrawer) return null

  // A drawer's grain is its front's, which faces forward.
  const axis = board?.axis ?? 'depth'
  const bands = board ? bandsOf(piece) : null
  const grain = grainOf(piece)
  const grained = grainedBoards.includes(board?.board ?? 'front')

  return (
    <>
      {bands && (
        <div className="finish">
          <span className="field-label">Edge banding</span>
          <div className="finish-edges">
            {boardEdges(axis).map((edge) => (
              <label key={edge} className="checkbox">
                <input
                  type="checkbox"
                  checked={bands.includes(edge)}
                  onChange={(event) =>
                    updatePiece(piece.id, {
                      bands: event.target.checked
                        ? [...bands, edge]
                        : bands.filter((banded) => banded !== edge),
                    })
                  }
                />
                {EDGE_LABELS[edge]}
              </label>
            ))}
          </div>
          <p className="hint">Starts with the edges that show; tick what this part needs.</p>
        </div>
      )}
      {grained && (
        <div className="finish">
          <span className="field-label">{isDrawer ? 'Front grain' : 'Grain'}</span>
          <span className="unit-switch wide-switch" role="radiogroup" aria-label="Grain">
            {faceDimensions(axis).map((dimension) => (
              <button
                key={dimension}
                type="button"
                role="radio"
                aria-checked={grain === dimension}
                onClick={() => updatePiece(piece.id, { grain: dimension })}
              >
                {GRAIN_LABELS[dimension]}
              </button>
            ))}
          </span>
        </div>
      )}
    </>
  )
}
