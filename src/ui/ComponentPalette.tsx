import { PIECE_GROUPS, PIECE_LABELS } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'

export function ComponentPalette() {
  const addPiece = useDesignStore((s) => s.addPiece)

  return (
    <>
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
