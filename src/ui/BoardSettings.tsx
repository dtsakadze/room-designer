import { useState } from 'react'
import { BOARDS, DEPTH_PRESETS, MAX_BOARD_NAME } from '../lib/defaults'
import type { BoardKey } from '../types'
import { UNITS, UNIT_ORDER } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore, useUnits } from '../store/useSettingsStore'
import { NumberField } from './NumberField'

/**
 * Project-wide settings, in three groups: the units lengths are shown in (a
 * preference of this browser), the boards (a thickness every part of theirs
 * follows, and a material name for the cut list), and how deep new parts start.
 */
export function BoardSettings() {
  const thickness = useDesignStore((s) => s.thickness)
  const setThickness = useDesignStore((s) => s.setThickness)
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const setUnitDepth = useDesignStore((s) => s.setUnitDepth)
  const setUnit = useSettingsStore((s) => s.setUnit)
  const { unit, num } = useUnits()

  return (
    <>
      <section className="section">
        <h2>Units</h2>
        <div className="unit-switch wide-switch" role="radiogroup" aria-label="Units">
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
        </div>
      </section>

      <section className="section">
        <h2>Boards</h2>
        <p className="hint board-intro">
          Every part follows its board&apos;s thickness. Names show in the cut list.
        </p>
        <div className="stack">
          {BOARDS.map((board) => (
            <div key={board.key} className="board">
              <NumberField
                label={
                  <span className="board-role">
                    <span className="board-label">{board.label}</span>
                    <span className="board-hint">{board.hint}</span>
                  </span>
                }
                value={thickness[board.key]}
                onChange={(mm) => setThickness({ [board.key]: mm })}
              />
              <BoardNameField board={board.key} example={board.example} />
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>New parts</h2>
        <div className="stack">
          <NumberField label="Depth" value={unitDepth} onChange={setUnitDepth} />
          <div className="unit-switch wide-switch" role="radiogroup" aria-label="Depth preset">
            {DEPTH_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                role="radio"
                aria-checked={unitDepth === preset.depth}
                onClick={() => setUnitDepth(preset.depth)}
              >
                {/* The unit is in the Depth field above; with it, the two don't fit. */}
                {preset.label} {num(preset.depth)}
              </button>
            ))}
          </div>
          <p className="hint">Parts you add from now on start this deep.</p>
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
      placeholder={`Material, e.g. ${example}`}
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
