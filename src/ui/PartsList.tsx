import { pieceLabel } from '../lib/defaults'
import { WALL_LABELS, activeWalls, hasSideWalls, wallOf } from '../lib/room'
import type { Piece } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { useUnits } from '../store/useSettingsStore'
import { hasModifier } from './shortcuts'
import { useClashes } from './useClashes'
import { useSpanWarnings } from './useSpanWarnings'
import { useClearanceWarnings } from './useClearanceWarnings'
import { useRoomOverhangs } from './useRoomOverhangs'

/**
 * Every part in the design, under its wall when there's more than one.
 * Clicking one selects it (and shows its wall), which also works for parts
 * that are hard to reach on the canvas (tiny, or covered by others).
 */
export function PartsList() {
  const pieces = useDesignStore((s) => s.pieces)
  const select = useDesignStore((s) => s.select)
  const toggleSelect = useDesignStore((s) => s.toggleSelect)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const room = useDesignStore((s) => s.room)
  const clashes = useClashes()
  const spans = useSpanWarnings()
  const clearance = useClearanceWarnings()
  const overhangs = useRoomOverhangs()
  const tightDrawers = new Set([...clearance.values()].map((warning) => warning.drawerId)).size
  const { num, unit } = useUnits()

  if (pieces.length === 0) return <p className="muted">No parts yet.</p>

  const list = (items: Piece[]) => (
    <ul className="parts-list">
      {items.map((piece) => (
        <li key={piece.id}>
          <button
            type="button"
            className={[
              'part-row',
              selectedIds.includes(piece.id) && 'part-row-selected',
              clashes.has(piece.id) && 'part-row-clash',
              (spans.has(piece.id) || clearance.has(piece.id) || overhangs.has(piece.id)) && 'part-row-warn',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={selectedIds.includes(piece.id)}
            // ⌘/Ctrl-click adds to the selection, like on the canvas.
            onClick={(event) => (hasModifier(event) ? toggleSelect(piece.id) : select(piece.id))}
          >
            <span>{pieceLabel(piece)}</span>
            <span className="part-size">
              {piece.kind === 'rod'
                ? `⌀${num(piece.height)} × ${num(piece.width)} ${unit}`
                : `${num(piece.width)} × ${num(piece.height)} × ${num(piece.depth)} ${unit}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {spans.size > 0 && (
        <p className="hint hint-warn">
          {spans.size === 1 ? '1 shelf spans' : `${spans.size} shelves span`} further than{' '}
          {spans.size === 1 ? 'it' : 'they'} safely can (shown in orange). Select one to see its
          limit.
        </p>
      )}
      {overhangs.size > 0 && (
        <p className="hint hint-warn">
          {overhangs.size === 1 ? '1 part sticks' : `${overhangs.size} parts stick`} out past a wall
          or the ceiling (shown in orange). Select one to see how far.
        </p>
      )}
      {tightDrawers > 0 && (
        <p className="hint hint-warn">
          {tightDrawers === 1 ? '1 drawer sits' : `${tightDrawers} drawers sit`} too close behind a
          door (shown in orange). Select one to set it back.
        </p>
      )}
      {clashes.size > 0 && (
        <p className="hint hint-error">
          {clashes.size} parts overlap each other (shown in red). Move or resize them so they
          only touch.
        </p>
      )}
      {hasSideWalls(room)
        ? activeWalls(room).map((wall) => {
            const onWall = pieces.filter((piece) => wallOf(piece) === wall)
            return (
              <div key={wall}>
                <h3 className="parts-wall">{WALL_LABELS[wall]}</h3>
                {onWall.length > 0 ? list(onWall) : <p className="muted">No parts yet.</p>}
              </div>
            )
          })
        : list(pieces)}
    </>
  )
}
