import { ACCESSORIES, PIECE_GROUPS, PIECE_LABELS, accessoryDefaults, slidingDoorDefaults } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { useUnits } from '../store/useSettingsStore'
import { MyBlocks } from './MyBlocks'

/** The buttons that add parts, and a line saying what new parts start with. */
export function ComponentPalette({ onNewPartSettings }: { onNewPartSettings: () => void }) {
  const addPiece = useDesignStore((s) => s.addPiece)
  const addBox = useDesignStore((s) => s.addBox)
  const thickness = useDesignStore((s) => s.thickness)
  const defaultColor = useDesignStore((s) => s.defaultColor)
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const { len } = useUnits()

  return (
    <>
      <MyBlocks />
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
            {group.kinds.map((kind) =>
              kind === 'accessory' ? (
                // One button for each type, each starting at its own size.
                ACCESSORIES.map((accessory) => (
                  <button
                    key={accessory.type}
                    type="button"
                    className="add-button"
                    onClick={() => addPiece('accessory', accessoryDefaults(accessory.type))}
                  >
                    {accessory.label}
                  </button>
                ))
              ) : (
                <button
                  key={kind}
                  type="button"
                  className="add-button"
                  onClick={() => addPiece(kind)}
                >
                  {PIECE_LABELS[kind]}
                </button>
              ),
            )}
            {/* Sliding doors are a door with a panel count, so they sit with the other fronts. */}
            {group.kinds.includes('door') && (
              <button
                type="button"
                className="add-button"
                onClick={() => addPiece('door', slidingDoorDefaults(thickness))}
              >
                Sliding doors
              </button>
            )}
          </div>
        </section>
      ))}
      {/* Set in Settings; shown here because it only affects what these buttons add. */}
      <button type="button" className="new-parts-line" onClick={onNewPartSettings}>
        <span className="muted">New parts:</span>
        <span>{len(unitDepth)} deep,</span>
        {defaultColor ? (
          <span className="board-swatch" style={{ background: defaultColor }} aria-label="their own colour" />
        ) : (
          <span>board colour</span>
        )}
        <span className="link-button">Change</span>
      </button>
    </>
  )
}
