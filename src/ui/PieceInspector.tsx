import type { ComponentType } from 'react'
import { ACCESSORIES, APPLIANCES, KINDS, PANE_THICKNESS, pieceLabel } from '../lib/defaults'
import { useUnitLabel, useUnits } from '../store/useSettingsStore'
import type { Piece, PieceKind } from '../types'
import { useDesignStore } from '../store/useDesignStore'
import { boardOf, faceColor } from '../canvas/colors'
import { CollapsibleSection } from './CollapsibleSection'
import { FinishFields, FinishSection } from './FinishFields'
import { NumberField } from './NumberField'
import { InspectorHeader } from './InspectorHeader'
import { BoolChoice, ChoiceRow, Facts, FieldGroup, PositionFields, SelectRow } from './InspectorFields'
import { wallOf } from '../lib/room'
import { fitBetweenSides, wallDepthStart } from '../lib/geometry'
import { maxRodSpan, rodCentreSupports } from '../lib/spans'
import { DoorOptions, DrawerOptions } from './FrontOptions'
import { PieceWarnings } from './PieceWarnings'
import { usePatch } from './usePatch'
import { ICON_PROPS } from './icons'

/**
 * The Selected panel for one part: problems first, then size and position
 * (what's changed most), then the part's own options, then its finish
 * (colour, edge banding, grain), folded since it's usually set once.
 */
export function PieceInspector({ piece }: { piece: Piece }) {
  const pieces = useDesignStore((s) => s.pieces)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const removePieces = useDesignStore((s) => s.removePieces)
  const boardColors = useDesignStore((s) => s.boardColors)
  const thickness = useDesignStore((s) => s.thickness)
  const unit = useUnitLabel()
  const { len } = useUnits()

  const patch = usePatch(piece)
  const boardOfPiece = boardOf(piece.kind)

  // A rod is round: one length along the wall, one diameter for the section.
  const isRod = piece.kind === 'rod'
  // A glass or mirror door isn't board: no thickness from the project, colour or banding.
  const board = piece.pane ? undefined : KINDS[piece.kind].board
  const options = KIND_OPTIONS[piece.kind]

  return (
    <>
      <InspectorHeader
        title={pieceLabel(piece)}
        onDuplicate={() => duplicatePiece(piece.id)}
        onDelete={() => removePieces([piece.id])}
      />
      <div className="inspector-body">
        <PieceWarnings piece={piece} />

        <FieldGroup title={`Size (${unit})`}>
          {isRod ? (
            <div className="field-row">
              <NumberField
                compact
                label="Length"
                value={piece.width}
                onChange={(width) => patch({ width })}
              />
              <NumberField
                compact
                label="Diameter"
                value={piece.height}
                onChange={(height) => patch({ height })}
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
                    onChange={(value) => patch({ [key]: value })}
                  />
                )
              })}
            </div>
          )}
          {KINDS[piece.kind].spans && (
            <FitButton piece={piece} pieces={pieces} onFit={(fit) => patch(fit)} />
          )}
        </FieldGroup>

        <PositionFields
          wall={wallOf(piece)}
          onWall={(wall) => patch({ wall })}
          x={piece.x}
          y={piece.y}
          z={wallDepthStart(pieces, thickness)(piece)}
          zCustom={piece.z !== undefined}
          onX={(x) => patch({ x })}
          onY={(y) => patch({ y })}
          onZ={(z) => patch({ z })}
          onZReset={() => patch({ z: undefined })}
        />

        {options && (
          <CollapsibleSection
            id={`inspector-${piece.kind}`}
            title={typeof options.title === 'string' ? options.title : options.title(piece)}
            defaultOpen
          >
            <options.Options piece={piece} />
          </CollapsibleSection>
        )}

        {!piece.pane && (
          <FinishSection
            ids={[piece.id]}
            value={piece.color ?? null}
            // Without a colour of its own, a part shows its board's.
            fallback={faceColor({ ...piece, color: undefined }, { boardColors })}
            boardColored={!!boardOfPiece && !!boardColors[boardOfPiece]}
          >
            <FinishFields piece={piece} />
          </FinishSection>
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
function FitButton({
  piece,
  pieces,
  onFit,
}: {
  piece: Piece
  pieces: Piece[]
  onFit: (fit: Pick<Piece, 'x' | 'width'>) => void
}) {
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
      onClick={() => fit && onFit(fit)}
    >
      <svg {...ICON_PROPS}>
        <path d="M3 5v14 M21 5v14 M7 12h10 M10 9l-3 3 3 3 M14 9l3 3-3 3" />
      </svg>
      {!fit ? 'Fit between sides: no sides here' : fits ? 'Fits between the sides' : 'Fit between sides'}
    </button>
  )
}

/** Adjustable shelves rest on pins; fixed ones are screwed to the sides. */
function ShelfOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  return (
    <BoolChoice
      label="Type"
      info="Adjustable shelves rest on pins and can move up or down. Fixed ones are screwed to the sides, which keeps them straight."
      value={!!piece.fixed}
      off="Adjustable"
      on="Fixed"
      onChange={(fixed) => patch({ fixed })}
    />
  )
}

/** Whether a rail runs along the front of the unit or the back. */
function RailOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  return (
    <ChoiceRow
      label="Sits at"
      value={piece.railAt ?? 'front'}
      options={[
        { value: 'front', text: 'Front' },
        { value: 'back', text: 'Back' },
      ]}
      onChange={(railAt) => patch({ railAt })}
    />
  )
}

/** A hanging rod: the centre supports a long one gets, and the pull-down lift for a high one. */
function RodOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  const { len } = useUnits()
  const centre = rodCentreSupports(piece)
  return (
    <>
      <BoolChoice
        label="Pull-down lift"
        info="For a rail too high to reach. The hardware list has a lift for this rod instead of end supports. Check the lift's size range and weight limit with the maker."
        value={!!piece.lift}
        onChange={(lift) => patch({ lift })}
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
  const patch = usePatch(piece)
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
      onChange={(accessory) => patch({ accessory })}
    />
  )
}

/**
 * Which appliance this is, which only changes what it's called and how it's
 * drawn; its size stays as set. A stand-in, so it's in neither list.
 */
function ApplianceOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
  const kind = APPLIANCES.find((appliance) => appliance.type === piece.appliance)
  return (
    <SelectRow
      label="Type"
      info={`A stand-in to check the fit, not bought or cut: it isn't in the cut list or the hardware list. It starts at a standard size, so change it to your model's. ${
        kind?.builtIn ? 'Built-in, so it starts flush with the front of the units around it.' : 'Starts against the wall.'
      }`}
      value={piece.appliance ?? APPLIANCES[0].type}
      options={APPLIANCES.map((appliance) => ({ value: appliance.type, text: appliance.label }))}
      onChange={(appliance) => patch({ appliance })}
    />
  )
}

/**
 * A filler strip or cornice and the ceiling: how far its top is below it, and
 * a button to close the gap (a filler grows up to it, a cornice moves up
 * until it touches).
 */
function TrimOptions({ piece }: { piece: Piece }) {
  const patch = usePatch(piece)
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
          patch(piece.kind === 'filler' ? { height: ceiling - piece.y } : { y: ceiling - piece.height })
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
 * The kinds of part that have options of their own: the title of their
 * section in the Selected panel, and what's in it.
 */
const KIND_OPTIONS: Partial<
  Record<PieceKind, { title: string | ((piece: Piece) => string); Options: ComponentType<{ piece: Piece }> }>
> = {
  shelf: { title: 'Shelf', Options: ShelfOptions },
  rail: { title: 'Rail', Options: RailOptions },
  rod: { title: 'Rod', Options: RodOptions },
  door: { title: (piece) => (piece.sliding ? 'Sliding doors' : 'Door'), Options: DoorOptions },
  drawer: { title: 'Drawer', Options: DrawerOptions },
  filler: { title: 'Filler strip', Options: TrimOptions },
  cornice: { title: 'Cornice', Options: TrimOptions },
  accessory: { title: 'Accessory', Options: AccessoryOptions },
  appliance: { title: 'Appliance', Options: ApplianceOptions },
}
