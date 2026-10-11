import { useState } from 'react'
import type { Piece, Room, Wall } from '../types'
import { WALL_LABELS, activeWalls } from '../lib/room'
import { CutListPanel } from '../ui/CutListPanel'
import { ShortcutsPanel } from '../ui/ShortcutsPanel'
import { MEASURE_SHORTCUT } from '../ui/shortcuts'
import { ExportViewMenu } from './ExportViewMenu'
import { VIEWS, type ViewName } from './views'

/**
 * The buttons along the bottom of the canvas: show or hide doors, measure,
 * export and fit the view, and open the cut list or the shortcuts, which
 * float in the same corner, so one at a time.
 */
export function CanvasTools({
  viewName,
  hasDoors,
  showDoors,
  onToggleDoors,
  measuring,
  onToggleMeasuring,
  shown,
  caption,
  fileName,
  onFit,
}: {
  viewName: ViewName
  hasDoors: boolean
  showDoors: boolean
  onToggleDoors: () => void
  measuring: boolean
  onToggleMeasuring: () => void
  /** What the view draws, to export. */
  shown: Piece[]
  /** Under an exported drawing: the project, the view and the units. */
  caption: string
  fileName: string
  onFit: () => void
}) {
  const [panel, setPanel] = useState<'cut-list' | 'shortcuts' | null>(null)
  const toggle = (which: 'cut-list' | 'shortcuts') => setPanel((open) => (open === which ? null : which))
  const flat = viewName !== '3d'

  return (
    <>
      <div className="canvas-tools">
        {hasDoors && (
          <button type="button" className="ghost-button" onClick={onToggleDoors} title="Doors stay in the cut list while hidden">
            {showDoors ? 'Hide doors' : 'Show doors'}
          </button>
        )}
        {flat && (
          <button
            type="button"
            className="ghost-button"
            aria-pressed={measuring}
            onClick={onToggleMeasuring}
            title={`Measure between two points (${MEASURE_SHORTCUT})`}
          >
            Measure <kbd>{MEASURE_SHORTCUT}</kbd>
          </button>
        )}
        {flat && <ExportViewMenu pieces={shown} view={viewName} caption={caption} fileName={fileName} />}
        {flat && (
          <button type="button" className="ghost-button" onClick={onFit}>
            Fit view
          </button>
        )}
        <button type="button" className="ghost-button" aria-pressed={panel === 'cut-list'} onClick={() => toggle('cut-list')}>
          Cut list
        </button>
        <button
          type="button"
          className="ghost-button shortcuts-button"
          aria-pressed={panel === 'shortcuts'}
          onClick={() => toggle('shortcuts')}
        >
          Shortcuts
        </button>
      </div>

      {panel === 'cut-list' && <CutListPanel onClose={() => setPanel(null)} />}
      {panel === 'shortcuts' && <ShortcutsPanel onClose={() => setPanel(null)} />}
    </>
  )
}

/**
 * The view switch along the top of the canvas and, in a room with more than
 * one wall, the wall switch beside it for the views that show one wall.
 */
export function ViewSwitchers({
  viewName,
  onView,
  room,
  activeWall,
  onWall,
}: {
  viewName: ViewName
  onView: (name: ViewName) => void
  room: Room
  activeWall: Wall
  onWall: (wall: Wall) => void
}) {
  // Only there when the room has more than one wall, so a single unit looks as before.
  const walls = activeWalls(room)
  return (
    <>
      {walls.length > 1 && viewName !== 'top' && viewName !== '3d' && (
        <div className="view-switcher wall-switcher" role="group" aria-label="Wall">
          {walls.map((wall) => (
            <button
              key={wall}
              type="button"
              className="ghost-button"
              aria-pressed={activeWall === wall}
              onClick={() => onWall(wall)}
            >
              {WALL_LABELS[wall]}
            </button>
          ))}
        </div>
      )}

      <div className="view-switcher" role="group" aria-label="View">
        {VIEWS.map(({ name, label }) => (
          <button
            key={name}
            type="button"
            className="ghost-button"
            aria-pressed={viewName === name}
            onClick={() => onView(name)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  )
}
