import { DOOR_OPEN_ANGLE, MATERIAL_LABELS, RUNNER_LENGTHS, pieceLabel } from '../lib/defaults'
import { runnerLength } from '../lib/drawer'
import { hasHandle } from '../lib/fixings'
import { setBack } from '../lib/clearance'
import type { Overhang } from '../lib/roomFit'
import { WALL_LABELS, wallOf } from '../lib/room'
import { useUnits } from '../store/useSettingsStore'
import { useDesignStore } from '../store/useDesignStore'
import type { Piece } from '../types'
import { useClearanceWarnings } from './useClearanceWarnings'
import { useRoomOverhangs } from './useRoomOverhangs'
import { useSpanWarnings } from './useSpanWarnings'
import { useSwingConflicts } from './useSwingConflicts'
import { usePatch } from './usePatch'

/** A part's problems, at the top of the Selected panel so they're seen before anything else. */
export function PieceWarnings({ piece }: { piece: Piece }) {
  return (
    <>
      <SpanNote piece={piece} />
      <ClearanceNote piece={piece} />
      <OverhangNote ids={[piece.id]} />
      {piece.kind === 'door' && !piece.sliding && <SwingWarning door={piece} />}
      {piece.kind === 'drawer' && <RunnerWarning piece={piece} />}
    </>
  )
}

/**
 * Says when a part (or a box, by its panels) sticks out past a wall of the
 * room or its ceiling, and how far.
 */
export function OverhangNote({ ids }: { ids: string[] }) {
  const overhangs = useRoomOverhangs()
  const { len } = useUnits()
  const worst = ids
    .map((id) => overhangs.get(id))
    .reduce<Overhang | undefined>((a, b) => (!a || (b && b.by > a.by) ? b : a), undefined)
  if (!worst) return null
  const where = {
    left: 'past the left side of the room',
    right: 'past the right side of the room',
    back: 'past the back wall',
    front: 'past the front end of the room',
    ceiling: 'above the ceiling',
  }[worst.past]
  return <p className="hint hint-warn">{`Sticks out ${len(worst.by)} ${where}. Move or resize it, or change the room.`}</p>
}

/**
 * Says when a drawer sits too close behind its door, on the drawer and on the
 * door, and sets the drawer back by what's missing from the drawer.
 */
function ClearanceNote({ piece }: { piece: Piece }) {
  const warning = useClearanceWarnings().get(piece.id)
  const drawer = useDesignStore((s) => s.pieces.find((candidate) => candidate.id === warning?.drawerId))
  const patch = usePatch(piece)
  const { len } = useUnits()
  if (!warning || !drawer) return null
  const gap =
    warning.gap < 0
      ? `front pokes ${len(-warning.gap)} through the door`
      : `front is ${len(warning.gap)} behind the door`
  const fix = setBack(drawer, warning)
  return (
    <>
      <p className="hint hint-warn">
        {piece.kind === 'drawer'
          ? `Its ${gap}, and it needs ${len(warning.needed)} for the hinges${hasHandle(drawer) ? ' and the handle' : ''}.`
          : `The drawer behind it is too close: its ${gap}, and it needs ${len(warning.needed)}. Select the drawer to fix it.`}
      </p>
      {piece.kind === 'drawer' && (
        <>
          <button type="button" className="ghost-button" onClick={() => patch(fix)}>
            Set back behind the door
          </button>
          {fix.depth < piece.depth && (
            <p className="hint">There isn&apos;t room: this also shortens the drawer to {len(fix.depth)}.</p>
          )}
        </>
      )}
    </>
  )
}

/** Says when a shelf spans further than it can safely between its supports, and what the limit is. */
function SpanNote({ piece }: { piece: Piece }) {
  const warning = useSpanWarnings().get(piece.id)
  const material = useDesignStore((s) => s.boardMaterials.body ?? 'chipboard')
  const { len } = useUnits()
  if (piece.kind === 'rod' || !warning) return null
  return (
    <p className="hint hint-warn">
      {`Spans ${len(warning.span)}, more than ${len(warning.max)}: ${MATERIAL_LABELS[material].toLowerCase()} this thick sags under a load. Add a divider, use a thicker or stiffer board (Settings → Boards), or make the bay narrower.`}
    </p>
  )
}

/** Says when a drawer is too shallow for the shortest runners. */
function RunnerWarning({ piece }: { piece: Piece }) {
  const thickness = useDesignStore((s) => s.thickness)
  const { len } = useUnits()
  if (runnerLength(piece, thickness) !== null) return null
  return (
    <p className="hint hint-error">
      Too shallow for runners: the shortest is {len(RUNNER_LENGTHS[0])}, plus {len(thickness.front)} for
      the front. Make the drawer deeper.
    </p>
  )
}

/** What the door runs into as it opens, if anything (only in a room with side walls). */
function SwingWarning({ door }: { door: Piece }) {
  const pieces = useDesignStore((s) => s.pieces)
  const hits = useSwingConflicts().get(door.id)
  if (!hits) return null

  const names = hits.map((hit) => {
    if (hit.kind === 'wall') return `the ${WALL_LABELS[hit.wall].toLowerCase()}`
    const part = pieces.find((candidate) => candidate.id === hit.id)
    if (!part) return 'another part'
    return `the ${pieceLabel(part).toLowerCase()} on the ${WALL_LABELS[wallOf(part)].toLowerCase()}`
  })
  return (
    <p className="hint hint-error">
      Opening to {door.openAngle ?? DOOR_OPEN_ANGLE}°, it hits {listed(names)}. See the Top view.
    </p>
  )
}

/** "a", "a and b", "a, b and c". */
const listed = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
