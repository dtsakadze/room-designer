import { HANGING_GUIDES, MAX_GUIDE_LABEL, MAX_HANGING_GUIDES } from '../lib/defaults'
import { useSettingsStore } from '../store/useSettingsStore'
import { NumberField } from './NumberField'

/**
 * The dashed lines shown under a selected hanging rod: whether to show them
 * and how far each kind of clothes hangs. A preference of this browser, like
 * the units, so it isn't saved in projects.
 */
export function HangingGuideSettings() {
  const show = useSettingsStore((s) => s.showHangingGuides)
  const setShow = useSettingsStore((s) => s.setShowHangingGuides)
  const guides = useSettingsStore((s) => s.hangingGuides)
  const setGuides = useSettingsStore((s) => s.setHangingGuides)

  const change = (index: number, patch: Partial<(typeof guides)[number]>) =>
    setGuides(guides.map((guide, i) => (i === index ? { ...guide, ...patch } : guide)))

  return (
    <section className="section">
      <h2>Hanging guides</h2>
      <div className="stack">
        <label className="checkbox">
          <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} />
          Show under a selected rod
        </label>
        <p className="hint">
          Each line is drawn this far below the rod, and turns red when a shelf or the floor is in the way.
        </p>
        {guides.map((guide, index) => (
          // Index keys: two guides can share a label, and the fields edit in place.
          <div key={index} className="board board-lengths">
            <input
              className="board-name"
              type="text"
              aria-label={`Name of hanging guide ${index + 1}`}
              placeholder="Clothes, e.g. Shirts"
              maxLength={MAX_GUIDE_LABEL}
              autoComplete="off"
              value={guide.label}
              onChange={(event) => change(index, { label: event.target.value })}
            />
            <NumberField
              label="Length"
              value={guide.length}
              onChange={(length) => length > 0 && change(index, { length })}
            />
            <button
              type="button"
              className="ghost-button"
              onClick={() => setGuides(guides.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ghost-button"
          disabled={guides.length >= MAX_HANGING_GUIDES}
          onClick={() => setGuides([...guides, { label: 'Clothes', length: 1000 }])}
        >
          Add guide
        </button>
        <button type="button" className="ghost-button" onClick={() => setGuides(HANGING_GUIDES)}>
          Reset to defaults
        </button>
      </div>
    </section>
  )
}
