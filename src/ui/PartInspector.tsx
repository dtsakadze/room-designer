import { innerSize } from '../lib/geometry'
import { PART_LABELS } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'
import { NumberField } from './NumberField'

export function PartInspector() {
  const cabinet = useDesignStore((s) => s.cabinet)
  const selectedId = useDesignStore((s) => s.selectedId)
  const updatePart = useDesignStore((s) => s.updatePart)
  const removePart = useDesignStore((s) => s.removePart)

  const part = cabinet.parts.find((candidate) => candidate.id === selectedId)
  if (!part) return null

  const inner = innerSize(cabinet)

  return (
    <div className="stack">
      <p className="muted">{PART_LABELS[part.kind]}</p>

      <NumberField
        label="Width"
        value={part.width}
        max={inner.width}
        onChange={(width) => updatePart(part.id, { width })}
      />
      <NumberField
        label="Height"
        value={part.height}
        max={inner.height}
        onChange={(height) => updatePart(part.id, { height })}
      />
      <NumberField
        label="Depth"
        value={part.depth}
        max={inner.depth}
        onChange={(depth) => updatePart(part.id, { depth })}
      />

      <hr className="rule" />

      <NumberField
        label="From left"
        value={part.x}
        min={0}
        max={inner.width - part.width}
        onChange={(x) => updatePart(part.id, { x })}
      />
      <NumberField
        label="From bottom"
        value={part.y}
        min={0}
        max={inner.height - part.height}
        onChange={(y) => updatePart(part.id, { y })}
      />
      <NumberField
        label="From back"
        value={part.z}
        min={0}
        max={inner.depth - part.depth}
        onChange={(z) => updatePart(part.id, { z })}
      />

      <button type="button" className="danger-button" onClick={() => removePart(part.id)}>
        Delete part
      </button>
    </div>
  )
}
