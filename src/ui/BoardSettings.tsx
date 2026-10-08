import { useState } from 'react'
import {
  BOARDS,
  DEPTH_PRESETS,
  JOINT_HINTS,
  JOINT_LABELS,
  MATERIAL_LABELS,
  MAX_BOARD_NAME,
} from '../lib/defaults'
import type { BoardKey, BoardMaterial, JointType } from '../types'
import { UNITS, UNIT_ORDER } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useSettingsStore, useUnits } from '../store/useSettingsStore'
import { NumberField } from './NumberField'
import { ColorField } from './ColorField'
import { BOARD_FILLS } from '../canvas/colors'
import { DEFAULT_HOLE_PITCH } from '../lib/shelfPins'

/**
 * Project-wide settings, in four groups: the units lengths are shown in (a
 * preference of this browser), the boards (a thickness every part of theirs
 * follows, a material name for the cut list, and whether it has a grain), the
 * spacing of shelf-pin holes, and how deep new parts start.
 */
export function BoardSettings() {
  const thickness = useDesignStore((s) => s.thickness)
  const setThickness = useDesignStore((s) => s.setThickness)
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const setUnitDepth = useDesignStore((s) => s.setUnitDepth)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const setBoardGrain = useDesignStore((s) => s.setBoardGrain)
  const boardColors = useDesignStore((s) => s.boardColors)
  const edgeColors = useDesignStore((s) => s.edgeColors)
  const setBoardColor = useDesignStore((s) => s.setBoardColor)
  const setEdgeColor = useDesignStore((s) => s.setEdgeColor)
  const holePitch = useDesignStore((s) => s.holePitch)
  const setHolePitch = useDesignStore((s) => s.setHolePitch)
  const boardMaterials = useDesignStore((s) => s.boardMaterials)
  const joints = useDesignStore((s) => s.joints)
  const setJoints = useDesignStore((s) => s.setJoints)
  const setBoardMaterial = useDesignStore((s) => s.setBoardMaterial)
  const setUnit = useSettingsStore((s) => s.setUnit)
  const { unit, num, len } = useUnits()

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
          Every part follows its board&apos;s thickness and colour (unless you give a part its own). Names show in the cut list. Pick the material the board is made of: shelves are checked against how far it can span without sagging (the body board's). Tick Grain for wood-look boards, so the cut list keeps the grain running the right way.
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
              <div className="unit-switch two-columns" role="radiogroup" aria-label={`${board.label} material`}>
                {(Object.keys(MATERIAL_LABELS) as BoardMaterial[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={(boardMaterials[board.key] ?? 'chipboard') === option}
                    onClick={() => setBoardMaterial(board.key, option)}
                  >
                    {MATERIAL_LABELS[option]}
                  </button>
                ))}
              </div>
              <ColorField
                label="Colour"
                value={boardColors[board.key] ?? null}
                fallback={BOARD_FILLS[board.key]}
                onChange={(color) => setBoardColor(board.key, color)}
                onReset={() => setBoardColor(board.key, null)}
              />
              {/* Back panels and drawer bottoms aren't banded. */}
              {board.key !== 'back' && (
                <ColorField
                  label="Edge banding"
                  value={edgeColors[board.key] ?? null}
                  fallback={boardColors[board.key] ?? BOARD_FILLS[board.key]}
                  onChange={(color) => setEdgeColor(board.key, color)}
                  onReset={() => setEdgeColor(board.key, null)}
                  emptyLabel="Like the board"
                />
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={grainedBoards.includes(board.key)}
                  onChange={(event) => setBoardGrain(board.key, event.target.checked)}
                />
                Grain
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Shelf pins</h2>
        <div className="stack">
          <NumberField label="Hole spacing" value={holePitch} onChange={setHolePitch} />
          <p className="hint">
            Adjustable shelves rest on pins in holes drilled this far apart in the sides, usually{' '}
            {len(DEFAULT_HOLE_PITCH)}. They snap to the holes; fixed shelves go anywhere.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Joints</h2>
        <div className="stack">
          <div className="choice choice-column" role="radiogroup" aria-label="Joints">
            {(Object.keys(JOINT_LABELS) as JointType[]).map((option) => (
              <label key={option} className="checkbox">
                <input
                  type="radio"
                  name="joints"
                  checked={joints === option}
                  onChange={() => setJoints(option)}
                />
                {JOINT_LABELS[option]}
              </label>
            ))}
          </div>
          <p className="hint">
            {JOINT_HINTS[joints]} Sets what the hardware list counts for the carcass joints and
            fixed shelves (typical numbers, not exact). Nothing is drawn.
          </p>
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
