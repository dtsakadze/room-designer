import {
  ACCESSORIES,
  BOARD,
  CLOSE_LABELS,
  DOOR_ANGLES,
  DOOR_OPEN_ANGLE,
  EXTENSION_LABELS,
  HANDLE_LABELS,
  PANE_LABELS,
  PANE_THICKNESS,
  MATERIAL_LABELS,
  RUNNER_LENGTHS,
  SLIDING_OVERLAP,
  SLIDING_PANELS,
  SLIDING_TRACK_HEIGHT,
  pieceLabel,
} from '../lib/defaults'
import { HINGE_FIT_LABELS, doorHinges } from '../lib/hinges'
import { swingConflicts } from '../lib/swing'
import { drawerParts, runnerLength } from '../lib/drawer'
import { useUnitLabel, useUnits } from '../store/useSettingsStore'
import type { Piece, PieceKind } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { boardOf, faceColor } from '../canvas/colors'
import { BoxInspector } from './BoxInspector'
import { CollapsibleSection } from './CollapsibleSection'
import { ColorField } from './ColorField'
import { FinishFields } from './FinishFields'
import { NumberField } from './NumberField'
import { InspectorHeader } from './InspectorHeader'
import { ChoiceRow, Facts, FieldGroup, PositionFields, SelectRow } from './InspectorFields'
import { WALL_LABELS, wallOf } from '../lib/room'
import { FITS_BETWEEN_SIDES, fitBetweenSides, slidingPanels, wallDepthStart } from '../lib/geometry'
import { maxRodSpan, rodCentreSupports } from '../lib/spans'
import { hasHandle } from '../lib/fixings'
import { setBack } from '../lib/clearance'
import { useClearanceWarnings } from './useClearanceWarnings'
import { useRoomOverhangs } from './useRoomOverhangs'
import type { Overhang } from '../lib/roomFit'
import { useSpanWarnings } from './useSpanWarnings'

/** The title of a part's own options, for the kinds that have any. */
const OPTION_TITLES: Partial<Record<PieceKind, string>> = {
  shelf: 'Shelf',
  rail: 'Rail',
  rod: 'Rod',
  door: 'Door',
  drawer: 'Drawer',
  filler: 'Filler strip',
  cornice: 'Cornice',
  accessory: 'Accessory',
}

/**
 * The Selected panel for one part: problems first, then size and position
 * (what's changed most), then the part's own options, then its finish
 * (colour, edge banding, grain), folded since it's usually set once.
 */
export function PieceInspector() {
  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const removePiece = useDesignStore((s) => s.removePiece)
  const boxes = useDesignStore((s) => s.boxes)
  const setPieceColors = useDesignStore((s) => s.setPieceColors)
  const boardColors = useDesignStore((s) => s.boardColors)
  const fitPiece = useDesignStore((s) => s.fitBetweenSides)
  const thickness = useDesignStore((s) => s.thickness)
  const unit = useUnitLabel()
  const { len } = useUnits()

  const piece = pieces.find((candidate) => candidate.id === selectedId)
  if (!piece) return null
  const boardOfPiece = boardOf(piece.kind)

  // A box's panel is edited through its box.
  const box = piece.boxId && boxes.find((candidate) => candidate.id === piece.boxId)
  if (box) return <BoxInspector box={box} panelId={piece.id} />

  // A rod is round: one length along the wall, one diameter for the section.
  const isRod = piece.kind === 'rod'
  // A glass or mirror door isn't board: no thickness from the project, colour or banding.
  const board = piece.pane ? undefined : BOARD[piece.kind]
  const optionsTitle = piece.kind === 'door' && piece.sliding ? 'Sliding doors' : OPTION_TITLES[piece.kind]
  const color = piece.color ?? faceColor({ ...piece, color: undefined }, { boardColors })

  return (
    <>
      <InspectorHeader
        title={pieceLabel(piece)}
        onDuplicate={() => duplicatePiece(piece.id)}
        onDelete={() => removePiece(piece.id)}
      />
      <div className="inspector-body">
        {/* Problems first, so they're seen before anything else. */}
        <SpanNote piece={piece} />
        <ClearanceNote piece={piece} />
        <OverhangNote ids={[piece.id]} />
        {piece.kind === 'door' && !piece.sliding && <SwingWarning door={piece} />}
        {piece.kind === 'drawer' && <RunnerWarning piece={piece} />}

        <FieldGroup title={`Size (${unit})`}>
          {isRod ? (
            <div className="field-row">
              <NumberField
                compact
                label="Length"
                value={piece.width}
                onChange={(width) => updatePiece(piece.id, { width })}
              />
              <NumberField
                compact
                label="Diameter"
                value={piece.height}
                onChange={(height) => updatePiece(piece.id, { height })}
              />
            </div>
          ) : (
            <div className="field-row">
              {DIMENSIONS.map(({ key, label }) => {
                // A board's thickness comes from the project, so it's shown, not edited.
                const isThickness = board?.axis === key || (!!piece.pane && key === 'depth')
                return (
                  <NumberField
                    key={key}
                    compact
                    label={isThickness ? 'Thickness' : label}
                    title={
                      isThickness
                        ? piece.pane
                          ? `Glass and mirror panes are ${len(PANE_THICKNESS)} thick.`
                          : 'Set for the whole project in Settings → Boards.'
                        : key === 'depth'
                          ? 'Not drawn in the front view; see the side, top and 3D views.'
                          : undefined
                    }
                    value={piece[key]}
                    readOnly={isThickness}
                    onChange={(value) => updatePiece(piece.id, { [key]: value })}
                  />
                )
              })}
            </div>
          )}
          {FITS_BETWEEN_SIDES.includes(piece.kind) && (
            <FitButton piece={piece} pieces={pieces} onFit={() => fitPiece(piece.id)} />
          )}
        </FieldGroup>

        <PositionFields
          wall={wallOf(piece)}
          onWall={(wall) => updatePiece(piece.id, { wall })}
          x={piece.x}
          y={piece.y}
          z={wallDepthStart(pieces, thickness)(piece)}
          zCustom={piece.z !== undefined}
          onX={(x) => updatePiece(piece.id, { x })}
          onY={(y) => updatePiece(piece.id, { y })}
          onZ={(z) => updatePiece(piece.id, { z })}
          onZReset={() => updatePiece(piece.id, { z: undefined })}
        />

        {optionsTitle && (
          <CollapsibleSection id={`inspector-${piece.kind}`} title={optionsTitle} defaultOpen>
            {piece.kind === 'shelf' && (
              <ChoiceRow
                label="Type"
                info="Adjustable shelves rest on pins and can move up or down. Fixed ones are screwed to the sides, which keeps them straight."
                value={piece.fixed ? 'fixed' : 'adjustable'}
                options={[
                  { value: 'adjustable', text: 'Adjustable' },
                  { value: 'fixed', text: 'Fixed' },
                ]}
                onChange={(value) => updatePiece(piece.id, { fixed: value === 'fixed' })}
              />
            )}
            {piece.kind === 'rail' && (
              <ChoiceRow
                label="Sits at"
                value={piece.railAt ?? 'front'}
                options={[
                  { value: 'front', text: 'Front' },
                  { value: 'back', text: 'Back' },
                ]}
                onChange={(railAt) => updatePiece(piece.id, { railAt })}
              />
            )}
            {isRod && <RodOptions piece={piece} />}
            {piece.kind === 'door' && <DoorOptions piece={piece} />}
            {(piece.kind === 'filler' || piece.kind === 'cornice') && <TrimOptions piece={piece} />}
            {piece.kind === 'accessory' && <AccessoryOptions piece={piece} />}
            {piece.kind === 'drawer' && <DrawerOptions piece={piece} />}
          </CollapsibleSection>
        )}

        {!piece.pane && (
          <CollapsibleSection
            id="inspector-finish"
            title="Finish"
            badge={<span className="board-swatch" style={{ background: color }} aria-hidden />}
          >
            <ColorField
              // A fresh picker per part, so it always opens on this part's colour and
              // a picker left open can't recolour the next part selected.
              key={piece.id}
              label="Colour"
              value={piece.color ?? null}
              // Without a colour of its own, a part shows its board's.
              fallback={faceColor({ ...piece, color: undefined }, { boardColors })}
              emptyLabel={boardOfPiece && boardColors[boardOfPiece] ? 'Board colour' : 'Standard'}
              onChange={(next) => setPieceColors([piece.id], next)}
              onReset={() => setPieceColors([piece.id], null)}
            />
            <FinishFields piece={piece} />
          </CollapsibleSection>
        )}
      </div>
    </>
  )
}

/**
 * Fills the gap between the side panels or dividers either side of the part,
 * to the mm. A full-width button under the size, since it's one of the most
 * useful things to do with a shelf or drawer; when it can't, or already
 * fits, it says so in its label.
 */
function FitButton({ piece, pieces, onFit }: { piece: Piece; pieces: Piece[]; onFit: () => void }) {
  const fit = fitBetweenSides(piece, pieces)
  const fits = !!fit && fit.x === piece.x && fit.width === piece.width
  return (
    <button
      type="button"
      className="add-button fit-button"
      disabled={!fit || fits}
      title={
        !fit
          ? 'Needs a side panel or divider on both sides, at this height.'
          : fits
            ? 'Fits exactly between the sides.'
            : piece.kind === 'drawer' && piece.overlay
              ? 'Sets the width and X so the front covers both sides.'
              : 'Sets the width and X to fill the gap between the sides.'
      }
      onClick={onFit}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path
          d="M3 5v14 M21 5v14 M7 12h10 M10 9l-3 3 3 3 M14 9l3 3-3 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!fit ? 'Fit between sides: no sides here' : fits ? 'Fits between the sides' : 'Fit between sides'}
    </button>
  )
}

/** A hanging rod: the centre supports a long one gets, and the pull-down lift for a high one. */
function RodOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const { len } = useUnits()
  const centre = rodCentreSupports(piece)
  return (
    <>
      <ChoiceRow
        label="Pull-down lift"
        info="For a rail too high to reach. The hardware list has a lift for this rod instead of end supports. Check the lift's size range and weight limit with the maker."
        value={piece.lift ? 'yes' : 'no'}
        options={[
          { value: 'no', text: 'No' },
          { value: 'yes', text: 'Yes' },
        ]}
        onChange={(value) => updatePiece(piece.id, { lift: value === 'yes' })}
      />
      {/* Not a warning: the hardware list already counts the brackets that fix it. */}
      <Facts
        lines={[
          centre > 0 &&
            `Longer than the ${len(maxRodSpan(piece.height))} a rod this thick carries: ${centre === 1 ? '1 centre support' : `${centre} centre supports`} in the hardware list`,
        ]}
      />
    </>
  )
}

/**
 * What kind of accessory this is, which only changes what it's called and
 * how it's drawn and listed; its size stays as set.
 */
function AccessoryOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const kind = ACCESSORIES.find((accessory) => accessory.type === piece.accessory)
  return (
    <SelectRow
      label="Type"
      info={
        kind?.pullOut
          ? 'Bought as one fitting with its runners: the hardware list has it by width and depth. Size it to the opening, less the room the runners need on each side.'
          : 'Bought as one fitting: the hardware list has it by width and depth.'
      }
      value={piece.accessory ?? ACCESSORIES[0].type}
      options={ACCESSORIES.map((accessory) => ({ value: accessory.type, text: accessory.label }))}
      onChange={(accessory) => updatePiece(piece.id, { accessory })}
    />
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
  const updatePiece = useDesignStore((s) => s.updatePiece)
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
          <button type="button" className="ghost-button" onClick={() => updatePiece(piece.id, fix)}>
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

/**
 * A filler strip or cornice and the ceiling: how far its top is below it, and
 * a button to close the gap (a filler grows up to it, a cornice moves up
 * until it touches).
 */
function TrimOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const ceiling = useDesignStore((s) => s.room.height)
  const { len } = useUnits()
  if (ceiling === undefined) {
    return <Facts lines={['Switch on the ceiling under Room to see how far it is from it.']} />
  }
  const gap = ceiling - (piece.y + piece.height)
  return (
    <>
      <button
        type="button"
        className="ghost-button"
        disabled={gap === 0}
        title={piece.kind === 'filler' ? 'Makes it taller or shorter to reach the ceiling.' : 'Moves it to touch the ceiling.'}
        onClick={() =>
          updatePiece(piece.id, piece.kind === 'filler' ? { height: ceiling - piece.y } : { y: ceiling - piece.height })
        }
      >
        Up to the ceiling
      </button>
      <Facts
        lines={[
          gap === 0
            ? 'Its top touches the ceiling'
            : gap > 0
              ? `Its top is ${len(gap)} below the ceiling`
              : `Its top is ${len(-gap)} above the ceiling`,
        ]}
      />
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
  return piece.sliding ? <SlidingOptions piece={piece} /> : <HingedOptions piece={piece} />
}

function TypeRow({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  return (
    <ChoiceRow
      label="Type"
      value={piece.sliding ? 'sliding' : 'hinged'}
      options={[
        { value: 'hinged', text: 'Hinged' },
        { value: 'sliding', text: 'Sliding' },
      ]}
      onChange={(value) =>
        updatePiece(piece.id, value === 'sliding' ? { sliding: SLIDING_PANELS[0], double: false } : { sliding: undefined })
      }
    />
  )
}

function HingedOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const hinges = doorHinges(pieces, thickness).filter((leaf) => leaf.doorId === piece.id)

  return (
    <>
      <TypeRow piece={piece} />
      <PanelRow piece={piece} />
      <ChoiceRow
        label="Leaves"
        value={piece.double ? 'double' : 'single'}
        options={[
          { value: 'single', text: 'Single' },
          { value: 'double', text: 'Double' },
        ]}
        onChange={(value) => updatePiece(piece.id, { double: value === 'double' })}
      />
      {/* A double door is hinged on both outer sides. */}
      {!piece.double && (
        <ChoiceRow
          label="Hinged on"
          value={piece.hinge ?? 'left'}
          options={[
            { value: 'left', text: 'Left' },
            { value: 'right', text: 'Right' },
          ]}
          onChange={(hinge) => updatePiece(piece.id, { hinge })}
        />
      )}
      <ChoiceRow
        label="Fit"
        info="Overlay: sits in front of the unit, covering its edges. Size it to the front it covers. Inset: sits inside the opening, flush with the front. Size it to the opening, less a small gap all round so it can swing."
        value={piece.inset ? 'inset' : 'overlay'}
        options={[
          { value: 'overlay', text: 'Overlay' },
          { value: 'inset', text: 'Inset' },
        ]}
        onChange={(value) => updatePiece(piece.id, { inset: value === 'inset' })}
      />
      <ChoiceRow
        label="Opens"
        info="Wide-angle hinges (155°, 170°) let the door open further, clear of what's next to it."
        value={String(piece.openAngle ?? DOOR_OPEN_ANGLE)}
        options={DOOR_ANGLES.map((angle) => ({ value: String(angle), text: `${angle}°` }))}
        onChange={(value) => updatePiece(piece.id, { openAngle: Number(value) as Piece['openAngle'] })}
      />
      <ChoiceRow
        label="Soft-close"
        value={piece.softClose ? 'yes' : 'no'}
        options={[
          { value: 'no', text: 'No' },
          { value: 'yes', text: 'Yes' },
        ]}
        onChange={(value) => updatePiece(piece.id, { softClose: value === 'yes' })}
      />
      <HandleRow piece={piece} />
      <Facts
        lines={[hinges.length > 0 && hingeText(hinges), piece.double && 'The width is both leaves together']}
      />
    </>
  )
}

/**
 * A set of sliding doors: how many panels, and how far they overlap. The
 * panels run in tracks along the top and bottom, which are part of the set's
 * size, so there is no swing, hinge or fit to choose.
 */
function SlidingOptions({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const panels = slidingPanels({ ...piece, sliding: piece.sliding! })
  const { len } = useUnits()

  return (
    <>
      <TypeRow piece={piece} />
      <ChoiceRow
        label="Panels"
        info="Width and height are the whole set, tracks included. Z is where the back lane starts; the front lane is one panel thickness and a small gap in front of it."
        value={String(piece.sliding)}
        options={SLIDING_PANELS.map((count) => ({ value: String(count), text: String(count) }))}
        onChange={(value) => updatePiece(piece.id, { sliding: Number(value) as Piece['sliding'] })}
      />
      <PanelRow piece={piece} />
      <NumberField
        label="Overlap"
        value={piece.overlap ?? SLIDING_OVERLAP}
        onChange={(overlap) => updatePiece(piece.id, { overlap })}
      />
      <HandleRow piece={piece} />
      <Facts
        lines={[
          `Each panel ${len(panels[0].width)} × ${len(panels[0].height)}`,
          `Tracks ${len(SLIDING_TRACK_HEIGHT)} top and bottom, in the cut list`,
        ]}
      />
    </>
  )
}

/** What the door runs into as it opens, if anything (only in a room with side walls). */
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

/**
 * What a door or drawer is opened with, for the hardware list: a handle or
 * knob (not chosen yet), a bar handle, a knob, a J-profile grip, nothing, or
 * for a hinged door a push-to-open latch. A drawer's push-to-open is its
 * runners'.
 */
function HandleRow({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const options: (keyof typeof HANDLE_LABELS)[] = [
    'handle',
    'bar',
    'knob',
    'profile',
    ...(piece.kind === 'door' && !piece.sliding ? (['push'] as const) : []),
    'none',
  ]
  const value = piece.noHandle ? 'none' : (piece.handle ?? 'handle')
  const choose = (option: keyof typeof HANDLE_LABELS) =>
    updatePiece(
      piece.id,
      option === 'none'
        ? { noHandle: true, handle: undefined }
        : { noHandle: false, handle: option === 'handle' ? undefined : option },
    )

  return (
    <SelectRow
      label={piece.kind === 'door' && piece.double ? 'Handle, each' : 'Handle'}
      info={
        value === 'profile'
          ? "A grip along the top edge (or down a sliding panel's edge): the hardware list has the profile cut to each front's length."
          : undefined
      }
      value={value}
      options={options.map((option) => ({ value: option, text: HANDLE_LABELS[option] }))}
      onChange={choose}
    />
  )
}

/** What the door's panels are made of: board, glass or a mirror. */
function PanelRow({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const { len } = useUnits()
  return (
    <ChoiceRow
      label="Panel"
      info={
        piece.pane
          ? `${PANE_LABELS[piece.pane]} panes are ${len(PANE_THICKNESS)} thick and bought to size: they're in the hardware list, not the cut list, and have no colour or edge banding.`
          : undefined
      }
      value={piece.pane ?? 'board'}
      options={[
        { value: 'board', text: 'Board' },
        { value: 'glass', text: PANE_LABELS.glass },
        { value: 'mirror', text: PANE_LABELS.mirror },
      ]}
      onChange={(value) => updatePiece(piece.id, { pane: value === 'board' ? undefined : value })}
    />
  )
}

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
  const runner = runnerLength(piece, thickness)
  const parts = drawerParts(piece, thickness)
  const front = parts.find((part) => part.role === 'front')!
  const side = parts.find((part) => part.role === 'side')!
  const bottom = parts.find((part) => part.role === 'bottom')!

  return (
    <>
      <ChoiceRow
        label="Fit"
        info={`Inset: the front sits inside the opening, flush with the unit. Size the drawer to its opening. Overlay: the front covers the unit's edges. Size the drawer to its front, the opening plus ${len(thickness.body)} all round.`}
        value={piece.overlay ? 'overlay' : 'inset'}
        options={[
          { value: 'inset', text: 'Inset' },
          { value: 'overlay', text: 'Overlay' },
        ]}
        onChange={(value) => updatePiece(piece.id, { overlay: value === 'overlay' })}
      />
      <ChoiceRow
        label="Runners"
        info="Standard runners let the drawer out about three quarters of the way; full extension, all the way."
        value={piece.extension ?? 'standard'}
        options={(['standard', 'full'] as const).map((value) => ({
          value,
          text: value === 'full' ? 'Full' : EXTENSION_LABELS[value],
        }))}
        onChange={(extension) => updatePiece(piece.id, { extension })}
      />
      <SelectRow
        label="Closing"
        info="Soft-close: the drawer pulls itself shut gently. Push-to-open: push the front to open it, so it needs no handle."
        value={piece.close ?? 'ordinary'}
        options={(['ordinary', 'soft', 'push'] as const).map((value) => ({ value, text: CLOSE_LABELS[value] }))}
        // Ordinary is stored as no value.
        onChange={(value) => updatePiece(piece.id, { close: value === 'ordinary' ? undefined : value })}
      />
      {piece.close !== 'push' && <HandleRow piece={piece} />}
      <Facts
        lines={[
          `Front ${len(front.width)} × ${len(front.height)}, a small gap all round`,
          `Box ${len(bottom.width)} wide, ${len(side.height + bottom.height)} high`,
          runner !== null && `A pair of ${len(runner)} runners; the box is as long`,
        ]}
      />
    </>
  )
}
