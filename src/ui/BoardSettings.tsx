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
import { DEFAULT_SHEETS } from '../lib/sheets'
import { NumberField } from './NumberField'
import { ColorField } from './ColorField'
import { useEditBatch } from './useEditBatch'
import { BOARD_FILLS } from '../canvas/colors'
import { DEFAULT_HOLE_PITCH } from '../lib/shelfPins'

/** The unit lengths are shown in: a preference of this browser, not the project. */
export function UnitSettings() {
  const setUnit = useSettingsStore((s) => s.setUnit)
  const { unit } = useUnits()

  return (
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
  )
}

/**
 * The project's four boards: a thickness every part of theirs follows, a
 * material name for the cut list, what it's made of, how it's bought, its
 * colours and grain. Each folds to one line with what matters most, and one
 * is open at a time, so the four fit on screen.
 */
export function BoardSettings() {
  const thickness = useDesignStore((s) => s.thickness)
  const boardMaterials = useDesignStore((s) => s.boardMaterials)
  const boardNames = useDesignStore((s) => s.boardNames)
  const boardColors = useDesignStore((s) => s.boardColors)
  const { len } = useUnits()
  const [openBoard, setOpenBoard] = useState<BoardKey | null>('body')

  return (
    <section className="section">
      <h2>Boards</h2>
      <p className="hint board-intro">
        Every part follows its board&apos;s thickness and colour, unless you give a part its own.
      </p>
      <div className="board-list">
        {BOARDS.map((board) => {
          const open = openBoard === board.key
          return (
            <div key={board.key} className="board-item">
              <button
                type="button"
                className="board-summary"
                aria-expanded={open}
                onClick={() => setOpenBoard(open ? null : board.key)}
              >
                <span
                  className="board-swatch"
                  style={{ background: boardColors[board.key] ?? BOARD_FILLS[board.key] }}
                  aria-hidden
                />
                <span className="board-role">
                  <span className="board-label">{board.label}</span>
                  <span className="board-hint">{board.hint}</span>
                </span>
                <span className="board-facts">
                  {len(thickness[board.key])} ·{' '}
                  {boardNames[board.key] || MATERIAL_LABELS[boardMaterials[board.key] ?? 'chipboard']}
                </span>
                <svg className="collapsible-chevron" viewBox="0 0 10 10" aria-hidden>
                  <path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              {open && <BoardFields board={board.key} example={board.example} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Everything about one board, shown when its row is open. */
function BoardFields({ board, example }: { board: BoardKey; example: string }) {
  const thickness = useDesignStore((s) => s.thickness[board])
  const setThickness = useDesignStore((s) => s.setThickness)
  const grained = useDesignStore((s) => s.grainedBoards.includes(board))
  const setBoardGrain = useDesignStore((s) => s.setBoardGrain)
  const boardColor = useDesignStore((s) => s.boardColors[board] ?? null)
  const edgeColor = useDesignStore((s) => s.edgeColors[board] ?? null)
  const setBoardColor = useDesignStore((s) => s.setBoardColor)
  const setEdgeColor = useDesignStore((s) => s.setEdgeColor)
  const material = useDesignStore((s) => s.boardMaterials[board] ?? 'chipboard')
  const setBoardMaterial = useDesignStore((s) => s.setBoardMaterial)
  const sheet = useDesignStore((s) => s.boardSheets[board])
  const setBoardSheet = useDesignStore((s) => s.setBoardSheet)
  const label = BOARDS.find((b) => b.key === board)!.label

  return (
    <div className="board">
      <NumberField label="Thickness" value={thickness} onChange={(mm) => setThickness({ [board]: mm })} />
      <BoardNameField board={board} example={example} />
      <div className="field-group">
        <span className="field-label">Made of</span>
        <div className="unit-switch two-columns" role="radiogroup" aria-label={`${label} material`}>
          {(Object.keys(MATERIAL_LABELS) as BoardMaterial[]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={material === option}
              onClick={() => setBoardMaterial(board, option)}
            >
              {MATERIAL_LABELS[option]}
            </button>
          ))}
        </div>
        {board === 'body' && (
          <p className="hint">Shelves are checked against how far it spans without sagging.</p>
        )}
      </div>
      <div className="field-group">
        <span className="field-label">Bought as</span>
        <div className="unit-switch wide-switch" role="radiogroup" aria-label={`${label} is bought`}>
          {[
            ['Cut to size', false],
            ['Whole sheets', true],
          ].map(([text, sheets]) => (
            <button
              key={String(text)}
              type="button"
              role="radio"
              aria-checked={!!sheet === sheets}
              onClick={() => setBoardSheet(board, sheets ? (sheet ?? DEFAULT_SHEETS[material]) : null)}
            >
              {String(text)}
            </button>
          ))}
        </div>
        <p className="hint">
          {sheet
            ? 'The cut list also shows how the parts fit on the sheets.'
            : 'You order the pieces from the cut list.'}
        </p>
      </div>
      {sheet && (
        <div className="sheet-fields">
          <NumberField
            label="Sheet length"
            value={sheet.length}
            onChange={(length) => setBoardSheet(board, { ...sheet, length })}
          />
          <NumberField
            label="Sheet width"
            value={sheet.width}
            onChange={(width) => setBoardSheet(board, { ...sheet, width })}
          />
          <NumberField label="Saw cut" value={sheet.kerf} onChange={(kerf) => setBoardSheet(board, { ...sheet, kerf })} />
        </div>
      )}
      <ColorField
        label="Colour"
        value={boardColor}
        fallback={BOARD_FILLS[board]}
        onChange={(color) => setBoardColor(board, color)}
        onReset={() => setBoardColor(board, null)}
      />
      {/* Back panels and drawer bottoms aren't banded. */}
      {board !== 'back' && (
        <ColorField
          label="Edge banding"
          value={edgeColor}
          fallback={boardColor ?? BOARD_FILLS[board]}
          onChange={(color) => setEdgeColor(board, color)}
          onReset={() => setEdgeColor(board, null)}
          emptyLabel="Like the board"
        />
      )}
      <label className="checkbox">
        <input type="checkbox" checked={grained} onChange={(event) => setBoardGrain(board, event.target.checked)} />
        Grain
        <span className="hint">wood look: the cut list keeps it running the right way</span>
      </label>
    </div>
  )
}

/** How the carcass is joined (for the hardware list) and the shelf-pin hole spacing. */
export function ConstructionSettings() {
  const holePitch = useDesignStore((s) => s.holePitch)
  const setHolePitch = useDesignStore((s) => s.setHolePitch)
  const joints = useDesignStore((s) => s.joints)
  const setJoints = useDesignStore((s) => s.setJoints)
  const { len } = useUnits()

  return (
    <>
      <section className="section">
        <h2>Joints</h2>
        <div className="stack">
          <div className="choice choice-column" role="radiogroup" aria-label="Joints">
            {(Object.keys(JOINT_LABELS) as JointType[]).map((option) => (
              <label key={option} className="checkbox">
                <input type="radio" name="joints" checked={joints === option} onChange={() => setJoints(option)} />
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
        <h2>Shelf pins</h2>
        <div className="stack">
          <NumberField label="Hole spacing" value={holePitch} onChange={setHolePitch} />
          <p className="hint">
            Adjustable shelves rest on pins in holes drilled this far apart in the sides, usually{' '}
            {len(DEFAULT_HOLE_PITCH)}. They snap to the holes; fixed shelves go anywhere.
          </p>
        </div>
      </section>
    </>
  )
}

/** What parts added from now on start with: a colour and a depth. Parts already placed keep theirs. */
export function NewPartSettings() {
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const setUnitDepth = useDesignStore((s) => s.setUnitDepth)
  const defaultColor = useDesignStore((s) => s.defaultColor)
  const setDefaultColor = useDesignStore((s) => s.setDefaultColor)
  const { num } = useUnits()

  return (
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
        <ColorField
          label="Colour"
          value={defaultColor}
          fallback={BOARD_FILLS.body}
          onChange={setDefaultColor}
          onReset={() => setDefaultColor(null)}
        />
        <p className="hint">Parts you add from now on start like this. Parts already placed keep theirs.</p>
      </div>
    </section>
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
  const batch = useEditBatch()
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
        batch.begin()
      }}
      onChange={(event) => {
        setText(event.target.value)
        setBoardName(board, event.target.value)
      }}
      onBlur={() => {
        setEditing(false)
        batch.end()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
