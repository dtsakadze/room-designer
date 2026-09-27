import { activeWalls, hasSideWalls } from '../lib/room'
import { useDesignStore } from '../store/useDesignStore'
import type { SideWall, Wall } from '../types'

const SHORT_LABELS: Record<Wall, string> = { left: 'Left', back: 'Back', right: 'Right' }

/**
 * Which wall a part or box stands against, to move it to another one. Only
 * shown when the room has more than one wall.
 */
export function WallField({
  wall,
  onChange,
}: {
  wall: Wall
  /** Gets no value for the back wall, which is how it's stored. */
  onChange: (wall: SideWall | undefined) => void
}) {
  const room = useDesignStore((s) => s.room)
  if (!hasSideWalls(room)) return null

  return (
    <div className="field">
      <span className="field-label">Wall</span>
      <span className="unit-switch" role="radiogroup" aria-label="Wall">
        {activeWalls(room).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={wall === option}
            onClick={() => onChange(option === 'back' ? undefined : option)}
          >
            {SHORT_LABELS[option]}
          </button>
        ))}
      </span>
    </div>
  )
}
