import { type ReactNode, useState } from 'react'
import { useUnitLabel } from '../store/useSettingsStore'
import type { SideWall, Wall } from '../types'
import { NumberField } from './NumberField'
import { WallField } from './WallField'

/** A titled block of the Selected panel; `aside` sits at the right of the title (a switch, a button). */
export function FieldGroup({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="field-group-box">
      <div className="field-group-title">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

type PositionFieldsProps = {
  wall: Wall
  onWall: (wall: SideWall | undefined) => void
  x: number
  y: number
  /** Where it starts front to back now, automatic or typed. */
  z: number
  /** Whether Z was typed, so it can go back to automatic. */
  zCustom: boolean
  onX: (mm: number) => void
  onY: (mm: number) => void
  onZ: (mm: number) => void
  onZReset: () => void
}

/**
 * Wall, X, Y and Z of a part or box, three to a row. Z is automatic (against
 * the back panel, or in front of the unit for doors and trim) until typed.
 */
export function PositionFields({ wall, onWall, x, y, z, zCustom, onX, onY, onZ, onZReset }: PositionFieldsProps) {
  const unit = useUnitLabel()
  return (
    <FieldGroup
      title={`Position (${unit})`}
      aside={zCustom && (
        <button type="button" className="link-button" title="Z back to automatic" onClick={onZReset}>
          Z to auto
        </button>
      )}
    >
      <WallField wall={wall} onChange={onWall} />
      <div className="field-row">
        <NumberField compact label="X" title="From the middle of the wall" value={x} onChange={onX} />
        <NumberField compact label="Y" title="Off the floor" value={y} onChange={onY} />
        <NumberField
          compact
          label={zCustom ? 'Z' : 'Z · auto'}
          title="From the wall to its back face. Automatic until you type a number."
          value={z}
          onChange={onZ}
        />
      </div>
    </FieldGroup>
  )
}

/**
 * An ⓘ that shows a longer explanation under its row when clicked (a hover
 * tooltip doesn't work on touch screens, and this text is too long for one).
 */
export function InfoTip({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="info-tip"
      aria-label={open ? 'Hide explanation' : 'Explain'}
      aria-expanded={open}
      title={text}
      onClick={onToggle}
    >
      i
    </button>
  )
}

/** A label, an optional ⓘ, and a control on the right; the ⓘ's text opens beneath. */
export function OptionRow({ label, info, children }: { label: string; info?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="option-row">
      <div className="field">
        <span className="field-label option-label">
          {label}
          {info && <InfoTip text={info} open={open} onToggle={() => setOpen(!open)} />}
        </span>
        {children}
      </div>
      {info && open && <p className="hint option-info">{info}</p>}
    </div>
  )
}

type Choice<T extends string> = { value: T; text: string }

/** One of a few short options, as a segmented switch. */
export function ChoiceRow<T extends string>({
  label,
  info,
  value,
  options,
  onChange,
}: {
  label: string
  info?: string
  value: T
  options: Choice<T>[]
  onChange: (value: T) => void
}) {
  return (
    <OptionRow label={label} info={info}>
      <span className="unit-switch" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.text}
          </button>
        ))}
      </span>
    </OptionRow>
  )
}

/** A yes-or-no option as a two-way switch: `off` first, then `on`. */
export function BoolChoice({
  label,
  info,
  value,
  off = 'No',
  on = 'Yes',
  onChange,
}: {
  label: string
  info?: string
  value: boolean
  off?: string
  on?: string
  onChange: (value: boolean) => void
}) {
  return (
    <ChoiceRow
      label={label}
      info={info}
      value={value ? 'on' : 'off'}
      options={[
        { value: 'off', text: off },
        { value: 'on', text: on },
      ]}
      onChange={(choice) => onChange(choice === 'on')}
    />
  )
}

/** One of many options (too many, or too long, for a switch), as a dropdown. */
export function SelectRow<T extends string>({
  label,
  info,
  value,
  options,
  onChange,
}: {
  label: string
  info?: string
  value: T
  options: Choice<T>[]
  onChange: (value: T) => void
}) {
  return (
    <OptionRow label={label} info={info}>
      <select className="option-select" aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
    </OptionRow>
  )
}

/** Worked-out numbers about the part, one short line each. */
export function Facts({ lines }: { lines: (string | false | null | undefined)[] }) {
  const shown = lines.filter(Boolean) as string[]
  if (shown.length === 0) return null
  return (
    <ul className="facts">
      {/* Index in the key: two lines could read the same. */}
      {shown.map((line, index) => (
        <li key={`${index}:${line}`}>{line}</li>
      ))}
    </ul>
  )
}
