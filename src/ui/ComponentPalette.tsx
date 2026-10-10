import { ACCESSORIES, PIECE_GROUPS, PIECE_LABELS, accessoryDefaults, slidingDoorDefaults } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { ColorField } from './ColorField'
import { MyBlocks } from './MyBlocks'

export function ComponentPalette() {
  const addPiece = useDesignStore((s) => s.addPiece)
  const addBox = useDesignStore((s) => s.addBox)
  const thickness = useDesignStore((s) => s.thickness)
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
    </>
  )
}
