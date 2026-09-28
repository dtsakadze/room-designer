import { useState } from 'react'
import { BOARDS, DEPTH_PRESETS, MAX_BOARD_NAME } from '../lib/defaults'
import type { BoardKey } from '../types'
import { UNITS, UNIT_ORDER } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore, useUnits } from '../store/useSettingsStore'
import { NumberField } from './NumberField'

/**
 * Project-wide sizes: the boards (a thickness every part of theirs follows,
 * and a name for the cut list), and the unit depth, which new parts start from.
 */
export function BoardSettings() {
  const thickness = useDesignStore((s) => s.thickness)
  const setThickness = useDesignStore((s) => s.setThickness)
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const setUnitDepth = useDesignStore((s) => s.setUnitDepth)
  const setUnit = useSettingsStore((s) => s.setUnit)
  const { unit, len } = useUnits()

  return (
    <>
      <section className="section">
        <h2>Units</h2>
        <div className="field">
          <span className="field-label">Show lengths in</span>
          <span className="unit-switch" role="radiogroup" aria-label="Units">
            {UNIT_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={unit === option}
                onClick={() => setUnit(option)}
              >
                {UNITS[option].label}
              </button>
            ))}
          </span>
        </div>
      </section>
      <section className="section">
        <h2>Boards</h2>
        <div className="stack">
          {BOARDS.map((board) => (
            <div key={board.key} className="board">
              <NumberField
                label={board.label}
                value={thickness[board.key]}
                onChange={(mm) => setThickness({ [board.key]: mm })}
              />
              <BoardNameField board={board.key} example={board.example} />
              <p className="hint">{board.hint}</p>
            </div>
          ))}
          <NumberField label="Unit depth" value={unitDepth} onChange={setUnitDepth} />
          <div className="button-row">
            {DEPTH_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="add-button"
                aria-pressed={unitDepth === preset.depth}
                onClick={() => setUnitDepth(preset.depth)}
              >
                {preset.label} {len(preset.depth)}
              </button>
            ))}
          </div>
          <p className="hint">New parts start this deep. Parts already placed keep their size.</p>
        </div>
      </section>
    </>
  )
}

/**
 * What a board is, for the cut list, e.g. "18 mm white melamine". Typing a
 * name is one undo step, like typing a number.
 */
function BoardNameField({ board, example }: { board: BoardKey; example: string }) {
  const name = useDesignStore((s) => s.boardNames[board] ?? '')
  const setBoardName = useDesignStore((s) => s.setBoardName)
  const [text, setText] = useState(name)
  const [editing, setEditing] = useState(false)
  // Undo, or opening another project, changes the name under the field.
  const shown = editing ? text : name

  return (
    <input
      className="board-name"
      type="text"
      aria-label={`Name of the ${BOARDS.find((b) => b.key === board)!.label.toLowerCase()} board`}
      placeholder={`Name, e.g. ${example}`}
      maxLength={MAX_BOARD_NAME}
      autoComplete="off"
      value={shown}
      onFocus={() => {
        setText(name)
        setEditing(true)
        useDesignStore.getState().beginBatch()
      }}
      onChange={(event) => {
        setText(event.target.value)
        setBoardName(board, event.target.value)
      }}
      onBlur={() => {
        setEditing(false)
        useDesignStore.getState().endBatch()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
