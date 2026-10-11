import { useState } from 'react'
import { DEFAULT_CEILING_HEIGHT, LAYOUT_LABELS, type Layout, WALL_LABELS, layoutOf, layoutWalls, wallOf, wallsSwitchedOff } from '../lib/room'
import { useDesignStore } from '../store/useDesignStore'
import type { Room, SideWall, Wall } from '../types'
import { NumberField } from './NumberField'

/**
 * Which walls of the room the wardrobe runs along, and the room's size. A
 * change that would switch off a wall with parts on it asks first, since
 * those parts are deleted with it.
 */
export function RoomSettings() {
  const room = useDesignStore((s) => s.room)
  const pieces = useDesignStore((s) => s.pieces)
  const setRoom = useDesignStore((s) => s.setRoom)
  const [pending, setPending] = useState<Pick<Room, 'left' | 'right'> | null>(null)
  const layout = layoutOf(room)
  // An L keeps its corner side when switching back from a U or one wall.
  const [side, setSide] = useState<SideWall>(room.right && !room.left ? 'right' : 'left')

  const partsOn = (walls: Wall[]) => pieces.filter((piece) => walls.includes(wallOf(piece))).length

  const change = (next: Pick<Room, 'left' | 'right'>) => {
    if (partsOn(wallsSwitchedOff(room, next)) > 0) setPending(next)
    else {
      setPending(null)
      setRoom(next)
    }
  }

  const walls = (next: Layout, corner = side) => layoutWalls(next, corner)

  const pendingWalls = pending ? wallsSwitchedOff(room, pending) : []
  const pendingCount = partsOn(pendingWalls)

  return (
    <section className="section">
      <div className="stack">
        <div className="unit-switch wide-switch" role="radiogroup" aria-label="Walls">
            {(Object.keys(LAYOUT_LABELS) as Layout[]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={layout === option}
                onClick={() => change(walls(option))}
              >
                {LAYOUT_LABELS[option]}
              </button>
            ))}
        </div>

        {layout === 'l' && (
          <div className="field">
            <span className="field-label">Side wall</span>
            <span className="unit-switch" role="radiogroup" aria-label="Side wall">
              {(['left', 'right'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={room[option]}
                  onClick={() => {
                    setSide(option)
                    change(walls('l', option))
                  }}
                >
                  {option === 'left' ? 'Left' : 'Right'}
                </button>
              ))}
            </span>
          </div>
        )}

        {pending && (
          <div className="stack">
            <p className="hint hint-error">
              This deletes the {pendingCount} part{pendingCount === 1 ? '' : 's'} on the{' '}
              {pendingWalls.map((wall) => WALL_LABELS[wall].toLowerCase()).join(' and the ')}.
              Undo brings them back.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  setRoom(pending)
                  setPending(null)
                }}
              >
                Delete and change
              </button>
              <button type="button" className="add-button" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={room.height !== undefined}
            onChange={(event) =>
              setRoom({ height: event.target.checked ? DEFAULT_CEILING_HEIGHT : undefined })
            }
          />
          Show the ceiling
        </label>
        {room.height !== undefined && (
          <>
            <NumberField
              label="Ceiling height"
              value={room.height}
              onChange={(height) => setRoom({ height })}
            />
            <p className="hint">
              Drawn as a dashed line. A selected filler strip or cornice can reach up to it.
            </p>
          </>
        )}

        {layout === 'one' ? (
          <p className="hint">L-shape: the back wall and one side wall. U-shape: all three.</p>
        ) : (
          <>
            <NumberField
              label="Width (back wall)"
              value={room.width}
              onChange={(width) => setRoom({ width })}
            />
            <NumberField
              label="Depth (side walls)"
              value={room.depth}
              onChange={(depth) => setRoom({ depth })}
            />
            <p className="hint">Inside sizes. Switch walls above the drawing.</p>
          </>
        )}
      </div>
    </section>
  )
}
