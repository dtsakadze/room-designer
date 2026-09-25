import { useDesignStore } from '../store/useDesignStore'

type ColorFieldProps = {
  label: string
  /** The colour set, or null when there's none (the standard look). */
  value: string | null
  /** What the picker opens on when nothing is set. */
  fallback: string
  onChange: (color: string) => void
  onReset: () => void
  resetLabel?: string
}

/**
 * A colour picker with a reset button. Dragging around inside the browser's
 * picker fires many changes, so the whole visit to the picker undoes as one step.
 */
export function ColorField({
  label,
  value,
  fallback,
  onChange,
  onReset,
  resetLabel = 'Reset',
}: ColorFieldProps) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="color-field">
        {value ? (
          <button type="button" className="link-button" onClick={onReset}>
            {resetLabel}
          </button>
        ) : (
          <span className="muted">Standard</span>
        )}
        <input
          type="color"
          aria-label={label}
          value={value ?? fallback}
          onFocus={() => useDesignStore.getState().beginBatch()}
          onBlur={() => useDesignStore.getState().endBatch()}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </div>
  )
}
