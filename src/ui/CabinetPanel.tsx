import { useDesignStore } from '../store/useDesignStore'
import { NumberField } from './NumberField'

export function CabinetPanel() {
  const cabinet = useDesignStore((s) => s.cabinet)
  const setCabinet = useDesignStore((s) => s.setCabinet)

  return (
    <div className="stack">
      <NumberField
        label="Width"
        value={cabinet.width}
        min={200}
        max={4000}
        onChange={(width) => setCabinet({ width })}
      />
      <NumberField
        label="Height"
        value={cabinet.height}
        min={200}
        max={3000}
        onChange={(height) => setCabinet({ height })}
      />
      <NumberField
        label="Depth"
        value={cabinet.depth}
        min={100}
        max={1200}
        onChange={(depth) => setCabinet({ depth })}
      />
      <NumberField
        label="Panel thickness"
        value={cabinet.thickness}
        min={6}
        max={60}
        step={1}
        onChange={(thickness) => setCabinet({ thickness })}
      />
      <label className="checkbox">
        <input
          type="checkbox"
          checked={cabinet.hasBack}
          onChange={(event) => setCabinet({ hasBack: event.target.checked })}
        />
        <span>Back panel</span>
      </label>
    </div>
  )
}
