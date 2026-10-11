import type { ReactNode } from 'react'

/** One option of a `Segmented` switch; `title` explains it on hover. */
export type SegmentedOption<T> = { value: T; text: ReactNode; title?: string }

/**
 * A row of buttons of which one is chosen, as a radio group. `wide` stretches
 * it across its column, `columns` lays it out two to a row.
 */
export function Segmented<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
  layout,
}: {
  /** Names the group for screen readers. */
  label: string
  /** Null when none is chosen. */
  value: T | null
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  layout?: 'wide' | 'columns'
}) {
  const className = layout === 'wide' ? 'unit-switch wide-switch' : layout === 'columns' ? 'unit-switch two-columns' : 'unit-switch'
  return (
    <span className={className} role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          // By position: two options could show the same text.
          key={index}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.text}
        </button>
      ))}
    </span>
  )
}
