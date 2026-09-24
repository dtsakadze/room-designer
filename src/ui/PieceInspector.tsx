import { BOARD, PIECE_LABELS } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { NumberField } from './NumberField'

export function PieceInspector() {
  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const removePiece = useDesignStore((s) => s.removePiece)

  const piece = pieces.find((candidate) => candidate.id === selectedId)
  if (!piece) return null

  // A rod is round: one length along the wall, one diameter for the section.
  const isRod = piece.kind === 'rod'
  const board = BOARD[piece.kind]

  return (
    <div className="stack">
      <p className="muted">{PIECE_LABELS[piece.kind]}</p>

      {isRod ? (
        <>
          <NumberField
            label="Length"
            value={piece.width}
            onChange={(width) => updatePiece(piece.id, { width })}
          />
          <NumberField
            label="Diameter"
            value={piece.height}
            onChange={(height) => updatePiece(piece.id, { height })}
          />
        </>
      ) : (
        <>
          {DIMENSIONS.map(({ key, label }) => {
            // A board's thickness comes from the project, so it's shown, not edited.
            const isThickness = board?.axis === key
            return (
              <NumberField
                key={key}
                label={isThickness ? `${label} (thickness)` : label}
                value={piece[key]}
                readOnly={isThickness}
                onChange={(value) => updatePiece(piece.id, { [key]: value })}
              />
            )
          })}
          <p className="hint">Depth is recorded for later, but not drawn in this view.</p>
          {board && (
            <p className="hint">Thickness is set for the whole project under Boards.</p>
          )}
        </>
      )}

      <hr className="rule" />

      <NumberField
        label="X (from centre)"
        value={piece.x}
        onChange={(x) => updatePiece(piece.id, { x })}
      />
      <NumberField
        label="Y (off floor)"
        value={piece.y}
        onChange={(y) => updatePiece(piece.id, { y })}
      />

      <div className="button-row">
        <button type="button" className="add-button" onClick={() => duplicatePiece(piece.id)}>
          Duplicate
        </button>
        <button type="button" className="danger-button" onClick={() => removePiece(piece.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

const DIMENSIONS = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'depth', label: 'Depth' },
] as const
