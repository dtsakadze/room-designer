import {
  CLOSE_LABELS,
  DOOR_ANGLES,
  DOOR_OPEN_ANGLE,
  EXTENSION_LABELS,
  HANDLE_LABELS,
  PANE_LABELS,
  PANE_THICKNESS,
  SLIDING_OVERLAP,
  SLIDING_PANELS,
  SLIDING_TRACK_HEIGHT,
} from '../lib/defaults'
import { HINGE_FIT_LABELS, doorHinges } from '../lib/hinges'
import { drawerParts, runnerLength } from '../lib/drawer'
import { slidingPanels } from '../lib/geometry'
import { useUnits } from '../store/useSettingsStore'
import { useDesignStore } from '../store/useDesignStore'
import type { Piece } from '../types'
import { NumberField } from './NumberField'
import { BoolChoice, ChoiceRow, Facts, SelectRow } from './InspectorFields'
import { usePatch } from './usePatch'

/**
 * Single or double, which side a single door is hinged on, overlay or inset,
 * and its hinges: how far they open and whether they're soft-close.
 */
export function DoorOptions({ piece }: { piece: Piece }) {
  return piece.sliding ? <SlidingOptions piece={piece} /> : <HingedOptions piece={piece} />
}

function TypeRow({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  return (
    <ChoiceRow
      label="Type"
      value={piece.sliding ? 'sliding' : 'hinged'}
      options={[
        { value: 'hinged', text: 'Hinged' },
        { value: 'sliding', text: 'Sliding' },
      ]}
      onChange={(value) => patch(value === 'sliding' ? { sliding: SLIDING_PANELS[0], double: false } : { sliding: undefined })}
    />
  )
}

function HingedOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const hinges = doorHinges(pieces, thickness).filter((leaf) => leaf.doorId === piece.id)

  return (
    <>
      <TypeRow piece={piece} />
      <PanelRow piece={piece} />
      <BoolChoice label="Leaves" value={!!piece.double} off="Single" on="Double" onChange={(double) => patch({ double })} />
      {/* A double door is hinged on both outer sides. */}
      {!piece.double && (
        <ChoiceRow
          label="Hinged on"
          value={piece.hinge ?? 'left'}
          options={[
            { value: 'left', text: 'Left' },
            { value: 'right', text: 'Right' },
          ]}
          onChange={(hinge) => patch({ hinge })}
        />
      )}
      <BoolChoice
        label="Fit"
        info="Overlay: sits in front of the unit, covering its edges. Size it to the front it covers. Inset: sits inside the opening, flush with the front. Size it to the opening, less a small gap all round so it can swing."
        value={!!piece.inset}
        off="Overlay"
        on="Inset"
        onChange={(inset) => patch({ inset })}
      />
      <ChoiceRow
        label="Opens"
        info="Wide-angle hinges (155°, 170°) let the door open further, clear of what's next to it."
        value={String(piece.openAngle ?? DOOR_OPEN_ANGLE)}
        options={DOOR_ANGLES.map((angle) => ({ value: String(angle), text: `${angle}°` }))}
        onChange={(value) => patch({ openAngle: Number(value) as Piece['openAngle'] })}
      />
      <BoolChoice label="Soft-close" value={!!piece.softClose} onChange={(softClose) => patch({ softClose })} />
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
  const patch = usePatch(piece)
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
        onChange={(value) => patch({ sliding: Number(value) as Piece['sliding'] })}
      />
      <PanelRow piece={piece} />
      <NumberField label="Overlap" value={piece.overlap ?? SLIDING_OVERLAP} onChange={(overlap) => patch({ overlap })} />
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

/**
 * What a door or drawer is opened with, for the hardware list: a handle or
 * knob (not chosen yet), a bar handle, a knob, a J-profile grip, nothing, or
 * for a hinged door a push-to-open latch. A drawer's push-to-open is its
 * runners'.
 */
function HandleRow({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
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
    patch(
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
  const patch = usePatch(piece)
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
      onChange={(value) => patch({ pane: value === 'board' ? undefined : value })}
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
export function DrawerOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  const thickness = useDesignStore((s) => s.thickness)
  const { len } = useUnits()
  const runner = runnerLength(piece, thickness)
  const parts = drawerParts(piece, thickness)
  const front = parts.find((part) => part.role === 'front')!
  const side = parts.find((part) => part.role === 'side')!
  const bottom = parts.find((part) => part.role === 'bottom')!

  return (
    <>
      <BoolChoice
        label="Fit"
        info={`Inset: the front sits inside the opening, flush with the unit. Size the drawer to its opening. Overlay: the front covers the unit's edges. Size the drawer to its front, the opening plus ${len(thickness.body)} all round.`}
        value={!!piece.overlay}
        off="Inset"
        on="Overlay"
        onChange={(overlay) => patch({ overlay })}
      />
      <ChoiceRow
        label="Runners"
        info="Standard runners let the drawer out about three quarters of the way; full extension, all the way."
        value={piece.extension ?? 'standard'}
        options={(['standard', 'full'] as const).map((value) => ({
          value,
          text: value === 'full' ? 'Full' : EXTENSION_LABELS[value],
        }))}
        onChange={(extension) => patch({ extension })}
      />
      <SelectRow
        label="Closing"
        info="Soft-close: the drawer pulls itself shut gently. Push-to-open: push the front to open it, so it needs no handle."
        value={piece.close ?? 'ordinary'}
        options={(['ordinary', 'soft', 'push'] as const).map((value) => ({ value, text: CLOSE_LABELS[value] }))}
        // Ordinary is stored as no value.
        onChange={(value) => patch({ close: value === 'ordinary' ? undefined : value })}
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
