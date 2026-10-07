import { NumberField } from './NumberField'

type ZFieldProps = {
  /** Where the part starts now, automatic or set by hand, in mm. */
  value: number
  /** Whether it was set by hand, so Reset has something to undo. */
  custom: boolean
  onChange: (mm: number) => void
  onReset: () => void
}

/**
 * Where a part starts front to back, in mm from the wall. Until it's typed it's
 * automatic (against the back panel, or in front of the unit for doors,
 * plinths and trim), and Reset goes back to that.
 */
export function ZField({ value, custom, onChange, onReset }: ZFieldProps) {
  return (
    <>
      <NumberField label="Z (from the wall)" value={value} onChange={onChange} />
      <p className="hint">
        How far its back face is from the wall.{' '}
        {custom ? (
          <button type="button" className="link-button" onClick={onReset}>
            Reset to automatic
          </button>
        ) : (
          'Automatic until you type a number.'
        )}
      </p>
    </>
  )
}
