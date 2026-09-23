type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 5000,
  step = 10,
  unit = 'mm',
}: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          value={Math.round(value)}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (!Number.isNaN(next)) onChange(next)
          }}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  )
}
