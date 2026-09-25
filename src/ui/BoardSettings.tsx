import { DEPTH_PRESETS } from '../lib/defaults'
import { UNITS, UNIT_ORDER } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore, useUnits } from '../store/useSettingsStore'
import { NumberField } from './NumberField'

/**
 * Project-wide sizes: board thicknesses, which every board follows, and the
 * unit depth, which new parts start from.
 */
export function BoardSettings() {
  const thickness = useDesignStore((s) => s.thickness)
  const setThickness = useDesignStore((s) => s.setThickness)
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const setUnitDepth = useDesignStore((s) => s.setUnitDepth)
  const setUnit = useSettingsStore((s) => s.setUnit)
  const { unit, len } = useUnits()

  return (
    <section className="section">
      <h2>Boards</h2>
      <div className="stack">
        <div className="field">
          <span className="field-label">Units</span>
          <span className="unit-switch" role="radiogroup" aria-label="Units">
            {UNIT_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={unit === option}
                onClick={() => setUnit(option)}
              >
                {UNITS[option].label}
              </button>
            ))}
          </span>
        </div>
        <NumberField
          label="Body thickness"
          value={thickness.body}
          onChange={(body) => setThickness({ body })}
        />
        <NumberField
          label="Back thickness"
          value={thickness.back}
          onChange={(back) => setThickness({ back })}
        />
        <NumberField label="Unit depth" value={unitDepth} onChange={setUnitDepth} />
        <div className="button-row">
          {DEPTH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="add-button"
              aria-pressed={unitDepth === preset.depth}
              onClick={() => setUnitDepth(preset.depth)}
            >
              {preset.label} {len(preset.depth)}
            </button>
          ))}
        </div>
        <p className="hint">New parts start this deep. Parts already placed keep their size.</p>
      </div>
    </section>
  )
}
