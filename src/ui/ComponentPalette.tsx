import { PIECE_GROUPS, PIECE_LABELS } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { ColorField } from './ColorField'

export function ComponentPalette() {
  const addPiece = useDesignStore((s) => s.addPiece)
  const addBox = useDesignStore((s) => s.addBox)
  const defaultColor = useDesignStore((s) => s.defaultColor)
  const setDefaultColor = useDesignStore((s) => s.setDefaultColor)

  return (
    <>
      {/* Sits with the add buttons because it only affects what they add. */}
      <section className="section">
        <ColorField
          label="New parts"
          value={defaultColor}
          fallback="#d8c9a3"
          onChange={setDefaultColor}
          onReset={() => setDefaultColor(null)}
        />
        <p className="hint">
          Colour the parts below start with. It doesn't change parts already placed.
        </p>
      </section>
      <section className="section">
        <h2>Carcass</h2>
        <button type="button" className="add-button box-button" onClick={addBox}>
          Box
          <span className="muted">sides, top, bottom and back, sized as one</span>
        </button>
      </section>
      {PIECE_GROUPS.map((group) => (
        <section key={group.title} className="section">
          <h2>{group.title}</h2>
          <div className="add-grid">
            {group.kinds.map((kind) => (
              <button
                key={kind}
                type="button"
                className="add-button"
                onClick={() => addPiece(kind)}
              >
                {PIECE_LABELS[kind]}
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
