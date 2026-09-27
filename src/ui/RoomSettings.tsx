import { useState } from 'react'
import { LAYOUT_LABELS, type Layout, WALL_LABELS, layoutOf, wallOf } from '../lib/room'
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

  /** The side walls a change switches off that have parts on them. */
  const losing = (next: Pick<Room, 'left' | 'right'>) =>
    (['left', 'right'] as const).filter((wall) => room[wall] && !next[wall])

  const partsOn = (walls: Wall[]) => pieces.filter((piece) => walls.includes(wallOf(piece))).length

  const change = (next: Pick<Room, 'left' | 'right'>) => {
    if (partsOn(losing(next)) > 0) setPending(next)
    else {
      setPending(null)
      setRoom(next)
    }
  }

  const walls = (next: Layout, corner = side): Pick<Room, 'left' | 'right'> =>
    next === 'u'
      ? { left: true, right: true }
      : next === 'l'
        ? { left: corner === 'left', right: corner === 'right' }
        : { left: false, right: false }

  const pendingWalls = pending ? losing(pending) : []
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

        {layout === 'one' ? (
          <p className="hint">
            For a wardrobe along more than one wall: an L-shape uses the back wall and one side
            wall, a U-shape all three.
          </p>
        ) : (
          <>
            <NumberField
              label="Room width"
              value={room.width}
              onChange={(width) => setRoom({ width })}
            />
            <NumberField
              label="Room depth"
              value={room.depth}
              onChange={(depth) => setRoom({ depth })}
            />
            <p className="hint">
              Inside sizes: the width runs along the back wall, the depth along the side walls.
              Switch between walls above the drawing.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
