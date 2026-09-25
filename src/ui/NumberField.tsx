import { useEffect, useRef, useState } from 'react'
import { UNITS, formatNumber, fromUnit } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore } from '../store/useSettingsStore'

type NumberFieldProps = {
  label: string
  /** A length in millimetres; shown and typed in the chosen unit. */
  value: number
  /** Gets the typed length back in millimetres. */
  onChange: (mm: number) => void
  readOnly?: boolean
}

/**
 * A text input rather than `type="number"`: number inputs report a lone "-" as
 * an empty value, which made negative coordinates impossible to type. Keeping
 * the raw text locally lets a half-typed number exist without the store seeing
 * it. Range is not enforced here — the store normalises every piece.
 *
 * Lengths are in mm, shown and typed in the unit from the settings; a comma
 * works as the decimal separator too.
 */
export function NumberField({
  label,
  value,
  onChange,
  readOnly = false,
}: NumberFieldProps) {
  const unit = useSettingsStore((s) => s.unit)
  const [text, setText] = useState(() => formatNumber(value, unit))
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setText(formatNumber(value, unit))
  }, [value, unit])

  const handleChange = (raw: string) => {
    setText(raw)
    const parsed = Number(raw.replace(',', '.'))
    if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(fromUnit(parsed, unit))
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          readOnly={readOnly}
          value={text}
          onFocus={() => {
            editing.current = true
            // Typing "1", "16", "160" is one edit, so it undoes as one step.
            useDesignStore.getState().beginBatch()
          }}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={() => {
            editing.current = false
            useDesignStore.getState().endBatch()
            setText(formatNumber(value, unit))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        <span className="field-unit">{UNITS[unit].label}</span>
      </span>
    </label>
  )
}
