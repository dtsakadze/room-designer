import { PIECE_LABELS } from '../lib/defaults'
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

  return (
    <div className="stack">
      <p className="muted">{PIECE_LABELS[piece.kind]}</p>

      <NumberField
        label="Width"
        value={piece.width}
        onChange={(width) => updatePiece(piece.id, { width })}
      />
      <NumberField
        label="Height"
        value={piece.height}
        onChange={(height) => updatePiece(piece.id, { height })}
      />
      <NumberField
        label="Depth"
        value={piece.depth}
        onChange={(depth) => updatePiece(piece.id, { depth })}
      />
      <p className="hint">Depth is recorded for later, but not drawn in this view.</p>

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
