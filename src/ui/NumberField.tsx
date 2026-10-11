import { type ReactNode, useEffect, useRef, useState } from 'react'
import { UNITS, formatNumber, fromUnit, parseLength, parseTyped } from '../lib/units'
import { useSettingsStore } from '../store/useSettingsStore'
import { useEditBatch } from './useEditBatch'

type NumberFieldProps = {
  label: ReactNode
  /** A length in millimetres; shown and typed in the chosen unit. */
  value: number
  /** Gets the typed length back in millimetres. */
  onChange: (mm: number) => void
  readOnly?: boolean
  /** Label above a narrow box, no unit, for three to a row; the unit goes in the row's heading. */
  compact?: boolean
  /** Explains the field on hover, e.g. why it can't be edited. */
  title?: string
}

/**
 * A text input rather than `type="number"`: number inputs report a lone "-" as
 * an empty value, which made negative coordinates impossible to type. Keeping
 * the raw text locally lets a half-typed number exist without the store seeing
 * it. Range is not enforced here — the store normalises every piece.
 *
 * Lengths are in mm, shown and typed in the unit from the settings; a comma
 * works as the decimal separator too, unless it can only be grouping
 * thousands ("1,200" mm; see `parseTyped`). Up and down arrows step the value by
 * the unit's smallest shown amount (1 mm in mm, cm and m), ten times that
 * with Shift, as a number input would.
 */
export function NumberField({
  label,
  value,
  onChange,
  readOnly = false,
  compact = false,
  title,
}: NumberFieldProps) {
  const unit = useSettingsStore((s) => s.unit)
  const [text, setText] = useState(() => formatNumber(value, unit))
  const editing = useRef(false)
  // Set by an arrow step, so the field shows what the store made of it (it
  // may round, clamp or snap the value) even while it has focus.
  const stepped = useRef(false)
  const batch = useEditBatch()

  useEffect(() => {
    if (!editing.current || stepped.current) setText(formatNumber(value, unit))
    stepped.current = false
  }, [value, unit])

  const step = (direction: 1 | -1, large: boolean) => {
    const size = 10 ** -UNITS[unit].decimals * (large ? 10 : 1)
    const parsed = parseTyped(text, unit)
    // From what's typed, if it's a number, so a half-typed edit carries on.
    const shown = Number.isFinite(parsed) ? parsed : Number(formatNumber(value, unit))
    const next = fromUnit(Number((shown + direction * size).toFixed(UNITS[unit].decimals)), unit)
    if (!Number.isFinite(next)) return
    stepped.current = true
    onChange(next)
  }

  const handleChange = (raw: string) => {
    // Typing takes over from a step the store didn't change anything for.
    stepped.current = false
    setText(raw)
    const mm = parseLength(raw, unit)
    if (mm !== null) onChange(mm)
  }

  return (
    <label className={compact ? 'field field-compact' : 'field'} title={title}>
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
            batch.begin()
          }}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={() => {
            editing.current = false
            batch.end()
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
        {!compact && <span className="field-unit">{UNITS[unit].label}</span>}
      </span>
    </label>
  )
}
