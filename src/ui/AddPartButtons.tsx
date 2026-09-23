import type { PartKind } from '../types'
import { PART_LABELS } from '../lib/defaults'
import { useDesignStore } from '../store/useDesignStore'

const KINDS: PartKind[] = ['shelf', 'divider', 'rod', 'drawer']

export function AddPartButtons() {
  const addPart = useDesignStore((s) => s.addPart)

  return (
    <div className="add-grid">
      {KINDS.map((kind) => (
        <button key={kind} type="button" className="add-button" onClick={() => addPart(kind)}>
          {PART_LABELS[kind]}
        </button>
      ))}
    </div>
  )
}
