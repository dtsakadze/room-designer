import { ACCESSORIES, APPLIANCES, KINDS, PIECE_GROUPS, accessoryDefaults, applianceDefaults, slidingDoorDefaults } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { closeSidebar } from '../store/useLayoutStore'
import { useUnits } from '../store/useSettingsStore'
import type { AccessoryType } from '../types'
import { MyBlocks } from './MyBlocks'
import { type IconName, PartIcon } from './PartIcon'

/** Accessory names short enough for a half-width button; the drawing's own short names are worded for the drawing. */
const ACCESSORY_BUTTONS: Record<AccessoryType, string> = {
  trouser: 'Trousers',
  tie: 'Ties, belts',
  basket: 'Basket',
  'shoes-pullout': 'Shoe rack',
  'shoes-angled': 'Shoe shelf',
}

/** On a small screen, closes the sidebar so the part just added shows. */

/** One add button: a picture of the part and its name (accessories use a short one, the full name on hover). */
function AddTile({ icon, label, title, onClick }: { icon: IconName; label: string; title: string; onClick: () => void }) {
  return (
    <button type="button" className="add-button add-tile" title={title} onClick={() => { onClick(); closeSidebar() }}>
      <PartIcon name={icon} />
      <span>{label}</span>
    </button>
  )
}

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
      {/* The usual start, so it leads, wider than the rest. */}
      <button type="button" className="add-button box-button" title="A carcass: sides, top, bottom and back, sized as one" onClick={() => { addBox(); closeSidebar() }}>
        <PartIcon name="box" size={28} />
        <span className="box-button-text">
          Box
          <span className="muted">sides, top, bottom, back</span>
        </span>
      </button>
      <MyBlocks />
      {PIECE_GROUPS.map((group) => (
        <section key={group.title} className="add-group">
          <h2>{group.title}</h2>
          <div className="add-grid">
            {group.kinds.flatMap((kind) =>
              kind === 'appliance'
                ? APPLIANCES.map((appliance) => (
                    <AddTile
                      key={appliance.type}
                      icon={appliance.type}
                      label={appliance.short}
                      title={appliance.label}
                      onClick={() => addPiece('appliance', applianceDefaults(appliance.type))}
                    />
                  ))
                : kind === 'accessory'
                ? // One button for each type, each starting at its own size.
                  ACCESSORIES.map((accessory) => (
                    <AddTile
                      key={accessory.type}
                      icon={accessory.type}
                      label={ACCESSORY_BUTTONS[accessory.type]}
                      title={accessory.label}
                      onClick={() => addPiece('accessory', accessoryDefaults(accessory.type))}
                    />
                  ))
                : [
                    <AddTile
                      key={kind}
                      icon={kind}
                      label={KINDS[kind].label}
                      title={KINDS[kind].label}
                      onClick={() => addPiece(kind)}
                    />,
                    // Sliding doors are a door with a panel count, so they sit with the other fronts.
                    kind === 'door' && (
                      <AddTile
                        key="sliding"
                        icon="sliding"
                        label="Sliding doors"
                        title="Sliding doors"
                        onClick={() => addPiece('door', slidingDoorDefaults(thickness))}
                      />
                    ),
                  ],
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
