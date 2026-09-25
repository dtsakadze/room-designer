import { PIECE_GROUPS, PIECE_LABELS } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'

export function ComponentPalette() {
  const addPiece = useDesignStore((s) => s.addPiece)
  const addBox = useDesignStore((s) => s.addBox)

  return (
    <>
      <section className="section">
        <h2>Units</h2>
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
