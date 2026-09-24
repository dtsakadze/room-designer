import { useEffect, useRef, useState } from 'react'

type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: string
  readOnly?: boolean
}

/**
 * A text input rather than `type="number"`: number inputs report a lone "-" as
 * an empty value, which made negative coordinates impossible to type. Keeping
 * the raw text locally lets a half-typed number exist without the store seeing
 * it. Range is not enforced here — the store normalises every piece.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit = 'mm',
  readOnly = false,
}: NumberFieldProps) {
  const [text, setText] = useState(() => String(Math.round(value)))
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setText(String(Math.round(value)))
  }, [value])

  const handleChange = (raw: string) => {
    setText(raw)
    const parsed = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(parsed)
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
          }}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={() => {
            editing.current = false
            setText(String(Math.round(value)))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  )
}
