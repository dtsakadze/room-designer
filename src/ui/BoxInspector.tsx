import { useDesignStore } from '../store/useDesignStore'
import type { Box } from '../types'
import { FILLS } from '../canvas/colors'
import { ColorField } from './ColorField'
import { NumberField } from './NumberField'
import { DELETE_SHORTCUT, DUPLICATE_SHORTCUT } from './shortcuts'

/**
 * Settings for a box: its outside size, position and how the top and bottom
 * meet the sides. Its panels are rebuilt from these on every change.
 */
export function BoxInspector({ box, panelId }: { box: Box; panelId: string }) {
  const updateBox = useDesignStore((s) => s.updateBox)
  const separateBox = useDesignStore((s) => s.separateBox)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const removePiece = useDesignStore((s) => s.removePiece)
  const setPieceColors = useDesignStore((s) => s.setPieceColors)
  // Filtered here, not in the selector: a selector that returns a new array
  // every time makes React re-render forever.
  const pieces = useDesignStore((s) => s.pieces)
  const panels = pieces.filter((piece) => piece.boxId === box.id)
  const colors = new Set(panels.map((piece) => piece.color ?? null))
  const shared = colors.size === 1 ? [...colors][0] : null

  return (
    <div className="stack">
      <p className="muted">Box (sides, top, bottom, back)</p>

      <ColorField
        key={box.id}
        label="Part colour"
        value={shared}
        fallback={FILLS.vertical}
        onChange={(color) => setPieceColors([panelId], color)}
        onReset={() => setPieceColors([panelId], null)}
      />

      <NumberField
        label="Width"
        value={box.width}
        onChange={(width) => updateBox(box.id, { width })}
      />
      <NumberField
        label="Height"
        value={box.height}
        onChange={(height) => updateBox(box.id, { height })}
      />
      <NumberField
        label="Depth"
        value={box.depth}
        onChange={(depth) => updateBox(box.id, { depth })}
      />
      <p className="hint">Outside sizes; the depth includes the back panel.</p>

      <div className="stack" role="radiogroup" aria-label="Top and bottom">
        {(
          [
            ['between', 'Top & bottom between the sides'],
            ['on', 'Top & bottom on top of the sides'],
          ] as const
        ).map(([joint, label]) => (
          <label key={joint} className="checkbox">
            <input
              type="radio"
              name={`joint-${box.id}`}
              checked={box.joint === joint}
              onChange={() => updateBox(box.id, { joint })}
            />
            {label}
          </label>
        ))}
      </div>

      <hr className="rule" />

      <NumberField
        label="X (from centre)"
        value={box.x}
        onChange={(x) => updateBox(box.id, { x })}
      />
      <NumberField
        label="Y (off floor)"
        value={box.y}
        onChange={(y) => updateBox(box.id, { y })}
      />

      <div className="button-row">
        <button
          type="button"
          className="add-button"
          onClick={() => duplicatePiece(panelId)}
          title={`Duplicate (${DUPLICATE_SHORTCUT})`}
        >
          Duplicate <kbd>{DUPLICATE_SHORTCUT}</kbd>
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => removePiece(panelId)}
          title={`Delete (${DELETE_SHORTCUT})`}
        >
          Delete <kbd>{DELETE_SHORTCUT}</kbd>
        </button>
      </div>
      <button type="button" className="ghost-button" onClick={() => separateBox(box.id)}>
        Separate panels
      </button>
      <p className="hint">Separating turns the box into loose panels you can edit one by one.</p>
    </div>
  )
}
