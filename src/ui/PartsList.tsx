import { pieceLabel } from '../lib/defaults'
import { WALL_LABELS, activeWalls, hasSideWalls, wallOf } from '../lib/room'
import type { Piece } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { closeSidebar } from '../store/useLayoutStore'
import { useUnits } from '../store/useSettingsStore'
import { hasModifier } from './shortcuts'
import { useClashes } from './useClashes'
import { useSpanWarnings } from './useSpanWarnings'
import { useClearanceWarnings } from './useClearanceWarnings'
import { useRoomOverhangs } from './useRoomOverhangs'

type Warning = { text: string; ids: string[]; error?: boolean }

/**
 * Every part in the design, under its wall when there's more than one.
 * Clicking one selects it (and shows its wall), which also works for parts
 * that are hard to reach on the canvas (tiny, or covered by others).
 */
export function PartsList() {
  const pieces = useDesignStore((s) => s.pieces)
  const select = useDesignStore((s) => s.select)
  const toggleSelect = useDesignStore((s) => s.toggleSelect)
  const clear = useDesignStore((s) => s.clear)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const room = useDesignStore((s) => s.room)
  const clashes = useClashes()
  const spans = useSpanWarnings()
  const clearance = useClearanceWarnings()
  const overhangs = useRoomOverhangs()
  const { num, unit } = useUnits()
  const drawerIds = new Set([...clearance.values()].map((warning) => warning.drawerId))

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
            onClick={(event) => {
              if (hasModifier(event)) toggleSelect(piece.id)
              else {
                select(piece.id)
                closeSidebar()
              }
            }}
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

  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
  const ids = (has: (id: string) => boolean) => pieces.filter((piece) => has(piece.id)).map((piece) => piece.id)
  // Overlaps first: they're errors, the rest are advice.
  const warnings: Warning[] = [
    { error: true, text: plural(clashes.size, 'part overlaps another', 'parts overlap'), ids: ids((id) => clashes.has(id)) },
    { text: `${plural(spans.size, 'shelf spans', 'shelves span')} too far`, ids: ids((id) => spans.has(id)) },
    { text: `${plural(overhangs.size, 'part sticks', 'parts stick')} out past a wall or the ceiling`, ids: ids((id) => overhangs.has(id)) },
    { text: `${plural(drawerIds.size, 'drawer is', 'drawers are')} too close behind a door`, ids: ids((id) => drawerIds.has(id)) },
  ].filter((warning) => warning.ids.length > 0)

  /** Selects the next part a warning is about, so its own panel explains it; clicking again moves on. */
  const show = (warningIds: string[]) => {
    const at = warningIds.indexOf(selectedIds.at(-1) ?? '')
    select(warningIds[(at + 1) % warningIds.length])
    closeSidebar()
  }

  return (
    <>
      {warnings.length > 0 && (
        <ul className="part-warnings">
          {warnings.map((warning) => (
            <li key={warning.text}>
              <button
                type="button"
                className={warning.error ? 'part-warning part-warning-error' : 'part-warning'}
                title={warning.ids.length > 1 ? 'Select the next one' : 'Select it'}
                onClick={() => show(warning.ids)}
              >
                <span className="part-warning-dot" aria-hidden />
                <span>{warning.text}</span>
                <span className="link-button">Show</span>
              </button>
            </li>
          ))}
        </ul>
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
      {/* Undo brings them back, so it asks nothing, but it stays small and out of the way. */}
      <button type="button" className="clear-parts" onClick={clear}>
        Clear all parts
      </button>
    </>
  )
}
