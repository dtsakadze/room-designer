import { type ReactNode, useEffect, useRef, useState } from 'react'
import { UNITS, formatNumber, fromUnit } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore } from '../store/useSettingsStore'

type NumberFieldProps = {
  label: ReactNode
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
 * works as the decimal separator too. Up and down arrows step the value by
 * the unit's smallest shown amount (1 mm in mm, cm and m), ten times that
 * with Shift, as a number input would.
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
  // Set by an arrow step, so the field shows what the store made of it (it
  // may round, clamp or snap the value) even while it has focus.
  const stepped = useRef(false)

  useEffect(() => {
    if (!editing.current || stepped.current) setText(formatNumber(value, unit))
    stepped.current = false
  }, [value, unit])

  const step = (direction: 1 | -1, large: boolean) => {
    const size = 10 ** -UNITS[unit].decimals * (large ? 10 : 1)
    const parsed = Number(text.replace(',', '.'))
    // From what's typed, if it's a number, so a half-typed edit carries on.
    const shown = text.trim() !== '' && Number.isFinite(parsed) ? parsed : Number(formatNumber(value, unit))
    const next = Number((shown + direction * size).toFixed(UNITS[unit].decimals))
    stepped.current = true
    onChange(fromUnit(next, unit))
  }

  const handleChange = (raw: string) => {
    // Typing takes over from a step the store didn't change anything for.
    stepped.current = false
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
            if (readOnly || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
            // Keeps the caret where it is, as a number input does.
            event.preventDefault()
            step(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey)
          }}
        />
        <span className="field-unit">{UNITS[unit].label}</span>
      </span>
    </label>
  )
}
