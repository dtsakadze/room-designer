import { type ReactNode, useState } from 'react'
import { BOARD } from '../lib/defaults'
import { EDGE_LABELS, GRAIN_LABELS, bandsOf, boardEdges, faceDimensions, grainOf } from '../lib/edges'
import { useDesignStore } from '../store/useDesignStore'
import type { Piece } from '../types'
import { InfoTip } from './InspectorFields'
import { CollapsibleSection } from './CollapsibleSection'
import { ColorField } from './ColorField'
import { Segmented } from './Segmented'

/**
 * The Finish section of the Selected panel: the colour of these parts
 * (`value`, or null without one of their own, when they show `fallback`, their
 * board's colour or the standard look), then `children` (banding, grain).
 */
export function FinishSection({
  ids,
  value,
  fallback,
  boardColored,
  children,
}: {
  ids: string[]
  value: string | null
  fallback: string
  /** Whether `fallback` is a colour set for the board, rather than the standard look. */
  boardColored: boolean
  children: ReactNode
}) {
  const setPieceColors = useDesignStore((s) => s.setPieceColors)
  return (
    <CollapsibleSection
      id="inspector-finish"
      title="Finish"
      badge={<span className="board-swatch" style={{ background: value ?? fallback }} aria-hidden />}
    >
      <ColorField
        // A fresh picker per selection, so it always opens on its colour and a
        // picker left open can't recolour the next part selected.
        key={ids.join()}
        label="Colour"
        value={value}
        fallback={fallback}
        emptyLabel={boardColored ? 'Board colour' : 'Standard'}
        onChange={(color) => setPieceColors(ids, color)}
        onReset={() => setPieceColors(ids, null)}
      />
      {children}
    </CollapsibleSection>
  )
}

const BANDING_INFO = 'Starts with the edges that show; tick what this part needs.'

/**
 * A part's edge banding and, on a board with grain, the way the grain runs.
 * Both start as what its kind usually has; changing them here is for this
 * part alone. A drawer's banding is fixed, but its front's grain can turn.
 */
export function FinishFields({ piece }: { piece: Piece }) {
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const [info, setInfo] = useState(false)
  const board = BOARD[piece.kind]
  const isDrawer = piece.kind === 'drawer'
  // Glass and mirror aren't board, so there's no banding or grain.
  if ((!board && !isDrawer) || piece.pane) return null

  // A drawer's grain is its front's, which faces forward.
  const axis = board?.axis ?? 'depth'
  const bands = board ? bandsOf(piece) : null
  const grain = grainOf(piece)
  const grained = grainedBoards.includes(board?.board ?? 'front')

  return (
    <>
      {bands && (
        <div className="finish">
          <span className="field-label option-label">
            Edge banding
            <InfoTip text={BANDING_INFO} open={info} onToggle={() => setInfo(!info)} />
          </span>
          {info && <p className="hint option-info">{BANDING_INFO}</p>}
          <div className="finish-edges">
            {boardEdges(axis).map((edge) => (
              <label key={edge} className="checkbox">
                <input
                  type="checkbox"
                  checked={bands.includes(edge)}
                  onChange={(event) =>
                    updatePiece(piece.id, {
                      bands: event.target.checked
                        ? [...bands, edge]
                        : bands.filter((banded) => banded !== edge),
                    })
                  }
                />
                {EDGE_LABELS[edge]}
              </label>
            ))}
          </div>
        </div>
      )}
      {grained && (
        <div className="finish">
          <span className="field-label">{isDrawer ? 'Front grain' : 'Grain'}</span>
          <Segmented
            label="Grain"
            layout="wide"
            value={grain}
            options={faceDimensions(axis).map((dimension) => ({ value: dimension, text: GRAIN_LABELS[dimension] }))}
            onChange={(dimension) => updatePiece(piece.id, { grain: dimension })}
          />
        </div>
      )}
    </>
  )
}
