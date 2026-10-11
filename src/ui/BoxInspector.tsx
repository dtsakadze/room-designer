import { useDesignStore } from '../store/useDesignStore'
import { useUnitLabel } from '../store/useSettingsStore'
import type { Box } from '../types'
import { faceColor, sharedColor } from '../canvas/colors'
import { FinishFields, FinishSection } from './FinishFields'
import { NumberField } from './NumberField'
import { InspectorHeader } from './InspectorHeader'
import { ChoiceRow, FieldGroup, PositionFields } from './InspectorFields'
import { CollapsibleSection } from './CollapsibleSection'
import { OverhangNote } from './PieceWarnings'
import { wallOf } from '../lib/room'
import { pieceLabel } from '../lib/defaults'

/**
 * Settings for a box: its outside size, position and how the top and bottom
 * meet the sides. Its panels are rebuilt from these on every change.
 */
export function BoxInspector({ box, panelId }: { box: Box; panelId: string }) {
  const updateBox = useDesignStore((s) => s.updateBox)
  const separateBox = useDesignStore((s) => s.separateBox)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const removePieces = useDesignStore((s) => s.removePieces)
  const boardColors = useDesignStore((s) => s.boardColors)
  // Filtered here, not in the selector: a selector that returns a new array
  // every time makes React re-render forever.
  const pieces = useDesignStore((s) => s.pieces)
  const panels = pieces.filter((piece) => piece.boxId === box.id)
  const panel = panels.find((piece) => piece.id === panelId)
  const unit = useUnitLabel()

  return (
    <>
      <InspectorHeader
        title="Box"
        onDuplicate={() => duplicatePiece(panelId)}
        onDelete={() => removePieces([panelId])}
      />
      <div className="inspector-body">
        <OverhangNote ids={panels.map((piece) => piece.id)} />

        <FieldGroup title={`Outside size (${unit})`}>
          <div className="field-row">
            <NumberField compact label="Width" value={box.width} onChange={(width) => updateBox(box.id, { width })} />
            <NumberField compact label="Height" value={box.height} onChange={(height) => updateBox(box.id, { height })} />
            <NumberField
              compact
              label="Depth"
              title="Includes the back panel."
              value={box.depth}
              onChange={(depth) => updateBox(box.id, { depth })}
            />
          </div>
        </FieldGroup>

        <PositionFields
          wall={wallOf(box)}
          onWall={(wall) => updateBox(box.id, { wall })}
          x={box.x}
          y={box.y}
          z={box.z ?? 0}
          zCustom={box.z !== undefined}
          onX={(x) => updateBox(box.id, { x })}
          onY={(y) => updateBox(box.id, { y })}
          onZ={(z) => updateBox(box.id, { z })}
          onZReset={() => updateBox(box.id, { z: undefined })}
        />

        <CollapsibleSection id="inspector-box" title="Box" defaultOpen>
          <ChoiceRow
            label="Top, bottom"
            info="Between the sides: the sides run the full height. On the sides: the top and bottom run the full width, over the sides' ends."
            value={box.joint}
            options={[
              { value: 'between', text: 'Between sides' },
              { value: 'on', text: 'On sides' },
            ]}
            onChange={(joint) => updateBox(box.id, { joint })}
          />
          <button
            type="button"
            className="ghost-button"
            title="Turns the box into loose panels you can edit one by one."
            onClick={() => separateBox(box.id)}
          >
            Separate panels
          </button>
        </CollapsibleSection>

        {/* Colouring one panel colours the whole box. */}
        <FinishSection
          ids={[panelId]}
          value={sharedColor(panels)}
          fallback={faceColor({ kind: 'vertical' }, { boardColors })}
          boardColored={!!boardColors.body}
        >
          {panel && (
            <>
              <p className="muted finish-panel">This panel: {PANEL_NAMES[panel.id.slice(box.id.length + 1)] ?? pieceLabel(panel)}</p>
              <FinishFields piece={panel} />
            </>
          )}
        </FinishSection>
      </div>
    </>
  )
}

/** A box's panels by role (panel ids are `<box id>:<role>`). */
const PANEL_NAMES: Record<string, string> = {
  left: 'Left side',
  right: 'Right side',
  top: 'Top',
  bottom: 'Bottom',
  back: 'Back panel',
}
