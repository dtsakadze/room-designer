import {
  BOARD,
  DOOR_ANGLES,
  DOOR_OPEN_ANGLE,
  EXTENSION_LABELS,
  RUNNER_LENGTHS,
  pieceLabel,
} from '../lib/defaults'
import { HINGE_FIT_LABELS, doorHinges } from '../lib/hinges'
import { swingConflicts } from '../lib/swing'
import { drawerParts, runnerLength } from '../lib/drawer'
import { useUnits } from '../store/useSettingsStore'
import type { Piece } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { FILLS } from '../canvas/colors'
import { BoxInspector } from './BoxInspector'
import { ColorField } from './ColorField'
import { FinishFields } from './FinishFields'
import { NumberField } from './NumberField'
import { DELETE_SHORTCUT, DUPLICATE_SHORTCUT } from './shortcuts'
import { WallField } from './WallField'
import { WALL_LABELS, wallOf } from '../lib/room'
import { FITS_BETWEEN_SIDES, fitBetweenSides } from '../lib/geometry'

export function PieceInspector() {
  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const removePiece = useDesignStore((s) => s.removePiece)
  const boxes = useDesignStore((s) => s.boxes)
  const setPieceColors = useDesignStore((s) => s.setPieceColors)
  const fitPiece = useDesignStore((s) => s.fitBetweenSides)

  const piece = pieces.find((candidate) => candidate.id === selectedId)
  if (!piece) return null

  // A box's panel is edited through its box.
  const box = piece.boxId && boxes.find((candidate) => candidate.id === piece.boxId)
  if (box) return <BoxInspector box={box} panelId={piece.id} />

  // A rod is round: one length along the wall, one diameter for the section.
  const isRod = piece.kind === 'rod'
  const board = BOARD[piece.kind]

  return (
    <div className="stack">
      <p className="muted">{pieceLabel(piece)}</p>

      <ColorField
        // A fresh picker per part, so it always opens on this part's colour and
        // a picker left open can't recolour the next part selected.
        key={piece.id}
        label="Part colour"
        value={piece.color ?? null}
        fallback={FILLS[piece.kind]}
        onChange={(color) => setPieceColors([piece.id], color)}
        onReset={() => setPieceColors([piece.id], null)}
      />

      {piece.kind === 'shelf' && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={!!piece.fixed}
            onChange={(event) => updatePiece(piece.id, { fixed: event.target.checked })}
          />
          Fixed: screwed to the sides, keeps them straight
        </label>
      )}

      {piece.kind === 'rail' && (
        <div className="choice" role="radiogroup" aria-label="Rail position">
          {(['front', 'back'] as const).map((at) => (
            <label key={at} className="checkbox">
              <input
                type="radio"
                name={`rail-${piece.id}`}
                checked={(piece.railAt ?? 'front') === at}
                onChange={() => updatePiece(piece.id, { railAt: at })}
              />
              {at === 'front' ? 'Front of the unit' : 'Back of the unit'}
            </label>
          ))}
        </div>
      )}

      {piece.kind === 'door' && <DoorOptions piece={piece} />}
      {piece.kind === 'drawer' && <DrawerOptions piece={piece} />}
      <FinishFields piece={piece} />

      {isRod ? (
        <>
          <NumberField
            label="Length"
            value={piece.width}
            onChange={(width) => updatePiece(piece.id, { width })}
          />
          <NumberField
            label="Diameter"
            value={piece.height}
            onChange={(height) => updatePiece(piece.id, { height })}
          />
        </>
      ) : (
        <>
          {DIMENSIONS.map(({ key, label }) => {
            // A board's thickness comes from the project, so it's shown, not edited.
            const isThickness = board?.axis === key
            return (
              <NumberField
                key={key}
                label={isThickness ? `${label} (thickness)` : label}
                value={piece[key]}
                readOnly={isThickness}
                onChange={(value) => updatePiece(piece.id, { [key]: value })}
              />
            )
          })}
          <p className="hint">Depth is recorded for later, but not drawn in this view.</p>
          {board && (
            <p className="hint">Thickness is set for the whole project under Boards.</p>
          )}
        </>
      )}

      {FITS_BETWEEN_SIDES.includes(piece.kind) && (
        <FitButton piece={piece} pieces={pieces} onFit={() => fitPiece(piece.id)} />
      )}

      <hr className="rule" />

      <WallField wall={wallOf(piece)} onChange={(wall) => updatePiece(piece.id, { wall })} />
      <NumberField
        label="X (from centre)"
        value={piece.x}
        onChange={(x) => updatePiece(piece.id, { x })}
      />
      <NumberField
        label="Y (off floor)"
        value={piece.y}
        onChange={(y) => updatePiece(piece.id, { y })}
      />

      <div className="button-row">
        <button
          type="button"
          className="add-button"
          onClick={() => duplicatePiece(piece.id)}
          title={`Duplicate (${DUPLICATE_SHORTCUT})`}
        >
          Duplicate <kbd>{DUPLICATE_SHORTCUT}</kbd>
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => removePiece(piece.id)}
          title={`Delete (${DELETE_SHORTCUT})`}
        >
          Delete <kbd>{DELETE_SHORTCUT}</kbd>
        </button>
      </div>
    </div>
  )
}

/**
 * Fills the gap between the side panels or dividers either side of the part,
 * to the mm. Says why it can't when there's no panel on one side, and that
 * it already fits when it does.
 */
function FitButton({ piece, pieces, onFit }: { piece: Piece; pieces: Piece[]; onFit: () => void }) {
  const fit = fitBetweenSides(piece, pieces)
  const fits = !!fit && fit.x === piece.x && fit.width === piece.width
  return (
    <>
      <button type="button" className="ghost-button" disabled={!fit || fits} onClick={onFit}>
        Fit between sides
      </button>
      <p className="hint">
        {!fit
          ? 'Needs a side panel or divider on both sides, at this height.'
          : fits
            ? 'Fits exactly between the sides.'
            : piece.kind === 'drawer' && piece.overlay
              ? 'Sets the width and X so the front covers both sides.'
              : 'Sets the width and X to fill the gap between the sides.'}
      </p>
    </>
  )
}

const DIMENSIONS = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'depth', label: 'Depth' },
] as const

/**
 * Single or double, which side a single door is hinged on, overlay or inset,
 * and its hinges: how far they open and whether they're soft-close.
 */
function DoorOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const hinges = doorHinges(pieces, thickness).filter((leaf) => leaf.doorId === piece.id)
  const choices: { label: string; value: string; options: [string, string, DoorPatch][] }[] = [
    {
      label: 'Door',
      value: piece.double ? 'double' : 'single',
      options: [
        ['single', 'Single', { double: false }],
        ['double', 'Double', { double: true }],
      ],
    },
    // A double door is hinged on both outer sides.
    ...(piece.double
      ? []
      : [
          {
            label: 'Hinges',
            value: piece.hinge ?? 'left',
            options: [
              ['left', 'Left', { hinge: 'left' }],
              ['right', 'Right', { hinge: 'right' }],
            ] as [string, string, DoorPatch][],
          },
        ]),
    {
      label: 'Fit',
      value: piece.inset ? 'inset' : 'overlay',
      options: [
        ['overlay', 'Overlay', { inset: false }],
        ['inset', 'Inset', { inset: true }],
      ],
    },
    {
      label: 'Opens',
      value: String(piece.openAngle ?? DOOR_OPEN_ANGLE),
      options: DOOR_ANGLES.map((angle): [string, string, DoorPatch] => [
        String(angle),
        `${angle}°`,
        { openAngle: angle },
      ]),
    },
  ]

  return (
    <>
      {choices.map((choice) => (
        <div key={choice.label} className="field">
          <span className="field-label">{choice.label}</span>
          <span className="unit-switch" role="radiogroup" aria-label={choice.label}>
            {choice.options.map(([value, text, patch]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={choice.value === value}
                onClick={() => updatePiece(piece.id, patch)}
              >
                {text}
              </button>
            ))}
          </span>
        </div>
      ))}
      <p className="hint">
        {piece.inset
          ? 'Inset: sits inside the opening, flush with the front. Size it to the opening, less a small gap all round so it can swing.'
          : 'Overlay: sits in front of the unit, covering its edges. Size it to the front it covers.'}
        {piece.double && ' The width is both leaves together.'}
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={!!piece.softClose}
          onChange={(event) => updatePiece(piece.id, { softClose: event.target.checked })}
        />
        Soft-close hinges
      </label>
      {hinges.length > 0 && (
        <p className="hint">
          {hingeText(hinges)}. Wide-angle hinges (155°, 170°) let the door open further, clear of
          what&apos;s next to it.
        </p>
      )}
      <SwingWarning door={piece} />
    </>
  )
}

/** What the door runs into as it opens to 110°, if anything (only in a room with side walls). */
function SwingWarning({ door }: { door: Piece }) {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  const hits = swingConflicts(pieces, thickness, room).get(door.id)
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

type DoorPatch = Pick<Piece, 'double' | 'hinge' | 'inset' | 'openAngle'>

/** "4 cup hinges, full overlay", or per leaf when a double door's leaves differ. */
function hingeText(leaves: ReturnType<typeof doorHinges>) {
  const each = leaves.map((leaf) => `${leaf.count} cup hinges, ${HINGE_FIT_LABELS[leaf.fit]}`)
  if (leaves.length === 1) return each[0]
  return each[0] === each[1] ? `${each[0]} on each leaf` : `Left leaf ${each[0]}; right leaf ${each[1]}`
}

/** The front's fit, the runner type, and what the drawer's size works out to. */
function DrawerOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const thickness = useDesignStore((s) => s.thickness)
  const { len } = useUnits()
  const extension = piece.extension ?? 'standard'
  const runner = runnerLength(piece, thickness)
  const parts = drawerParts(piece, thickness)
  const front = parts.find((part) => part.role === 'front')!
  const side = parts.find((part) => part.role === 'side')!
  const bottom = parts.find((part) => part.role === 'bottom')!
  const choices = [
    {
      label: 'Fit',
      value: piece.overlay ? 'overlay' : 'inset',
      options: [
        { value: 'inset', text: 'Inset', patch: { overlay: false } },
        { value: 'overlay', text: 'Overlay', patch: { overlay: true } },
      ],
    },
    {
      label: 'Runners',
      value: extension,
      options: (['standard', 'full'] as const).map((value) => ({
        value,
        text: EXTENSION_LABELS[value],
        patch: { extension: value },
      })),
    },
  ]

  return (
    <>
      {choices.map((choice) => (
        <div key={choice.label} className="field">
          <span className="field-label">{choice.label}</span>
          <span className="unit-switch" role="radiogroup" aria-label={choice.label}>
            {choice.options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={choice.value === option.value}
                onClick={() => updatePiece(piece.id, option.patch)}
              >
                {option.text}
              </button>
            ))}
          </span>
        </div>
      ))}
      <p className="hint">
        {piece.overlay
          ? `Overlay: the front covers the unit's edges. Size the drawer to its front, the opening plus ${len(thickness.body)} all round.`
          : 'Inset: the front sits inside the opening, flush with the unit. Size the drawer to its opening.'}{' '}
        The front is {len(front.width)} × {len(front.height)}, leaving a small gap all round.
      </p>
      <p className="hint">
        {extension === 'full'
          ? 'Full extension: the drawer pulls out all the way.'
          : 'Standard: the drawer pulls out about three quarters of the way.'}{' '}
        The box is {len(bottom.width)} wide, leaving room for the runners each side, and{' '}
        {len(side.height + bottom.height)} high.
      </p>
      {runner === null ? (
        <p className="hint hint-error">
          Too shallow for runners: the shortest is {len(RUNNER_LENGTHS[0])}, plus{' '}
          {len(thickness.front)} for the front. Make the drawer deeper.
        </p>
      ) : (
        <p className="hint">
          A pair of {len(runner)} runners; the box is as long.
        </p>
      )}
    </>
  )
}
