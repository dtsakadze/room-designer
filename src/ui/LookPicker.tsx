import { useState } from 'react'
import { BOARDS } from '../lib/defaults'
import { BOARD_FILLS } from '../canvas/colors'
import { LOOKS, STANDARD_LOOK, type Look } from '../lib/looks'
import { useDesignStore } from '../store/useDesignStore'

/**
 * Ready-made looks to try in one click: the colour of each board, its edge
 * banding and which boards have a grain. The one that matches the project now
 * is marked. Parts you coloured by hand keep their colour unless you say
 * otherwise.
 */
export function LookPicker() {
  const applyLook = useDesignStore((s) => s.applyLook)
  const boardColors = useDesignStore((s) => s.boardColors)
  const edgeColors = useDesignStore((s) => s.edgeColors)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const coloured = useDesignStore((s) => s.pieces.some((piece) => piece.color))
  const [resetParts, setResetParts] = useState(false)

  const current = (look: Look) =>
    JSON.stringify([boardColors, edgeColors, grainedBoards]) ===
    JSON.stringify([
      look.boardColors,
      look.edgeColors,
      BOARDS.map(({ key }) => key).filter((key) => look.grained.includes(key)),
    ])

  return (
    <section className="section">
      <h2>Look</h2>
      <div className="stack">
        <div className="looks" role="radiogroup" aria-label="Look">
          {[STANDARD_LOOK, ...LOOKS].map((look) => (
            <button
              key={look.id}
              type="button"
              role="radio"
              aria-checked={current(look)}
              className="look-button"
              onClick={() => applyLook(look, resetParts)}
            >
              <span className="look-swatches" aria-hidden="true">
                {(['body', 'front', 'drawer'] as const).map((board) => (
                  <span key={board} style={{ background: look.boardColors[board] ?? BOARD_FILLS[board] }} />
                ))}
              </span>
              {look.name}
            </button>
          ))}
        </div>
        {coloured && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={resetParts}
              onChange={(event) => setResetParts(event.target.checked)}
            />
            Also reset parts I coloured myself
          </label>
        )}
        <p className="hint">
          Sets the colour and edge banding of every board, and which have a grain. You can change
          any of them below afterwards. Standard goes back to no colours and no grain, as a new project starts; Undo brings back the old look.
        </p>
      </div>
    </section>
  )
}
