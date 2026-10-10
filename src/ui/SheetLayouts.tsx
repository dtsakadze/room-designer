import { boardName } from '../lib/defaults'
import type { BoardLayout } from '../lib/sheets'
import { useUnits } from '../store/useSettingsStore'
import type { BoardNames } from '../types'

/**
 * How the parts of each board bought as whole sheets fit onto its sheets:
 * every sheet drawn to scale, with the parts placed on it. Boards bought cut
 * to size aren't here: they're ordered from the cut list.
 */
export function SheetLayouts({ layouts, boardNames }: { layouts: BoardLayout[]; boardNames: BoardNames }) {
  const { len, num } = useUnits()
  if (layouts.length === 0) return null

  return (
    <>
      <h3>Sheet layout</h3>
      {layouts.map((layout) => {
        const { sheets, setup, oversize } = layout
        return (
          <div key={layout.board} className="sheet-layout">
            <p>
              <strong>{boardName(layout.board, boardNames)}</strong>
              <span className="muted">
                {' '}
                ·{' '}
                {sheets.length === 0
                  ? 'no parts'
                  : `${sheets.length} sheet${sheets.length === 1 ? '' : 's'} of ${len(setup.length)} × ${len(setup.width)} · ${Math.round(layout.waste * 100)}% waste`}
              </span>
            </p>
            {oversize.length > 0 && (
              <p className="hint hint-error">
                Too big for the sheet:{' '}
                {oversize.map((part) => `${part.label} (${len(part.length)} × ${len(part.width)})`).join(', ')}.
                Use a bigger sheet or buy these cut to size.
              </p>
            )}
            <div className="sheet-grid">
            {sheets.map((sheet, index) => {
              // Text sized to the sheet, so it reads the same however big the sheet is.
              const text = setup.length / 70
              return (
                <svg
                  key={index}
                  className="sheet-drawing"
                  viewBox={`0 0 ${setup.length} ${setup.width}`}
                  role="img"
                  aria-label={`Sheet ${index + 1} of ${sheets.length}`}
                >
                  <rect width={setup.length} height={setup.width} fill="#f4f1e8" stroke="#9c8f6d" strokeWidth={text / 5} />
                  {sheet.parts.map((part, partIndex) => {
                    const size = `${num(part.length)} × ${num(part.width)}`
                    const fits = part.length > size.length * text * 0.62 && part.width > text * 1.4
                    return (
                      <g key={partIndex}>
                        <title>{`${part.label}: ${size}${part.turned ? ' (turned)' : ''}`}</title>
                        <rect
                          x={part.x}
                          y={part.y}
                          width={part.length}
                          height={part.width}
                          fill="#e4d6aa"
                          stroke="#6f6450"
                          strokeWidth={text / 8}
                        />
                        {fits && (
                          <text
                            x={part.x + part.length / 2}
                            y={part.y + part.width / 2 + text / 3}
                            textAnchor="middle"
                            fontSize={text}
                            fill="#4a4333"
                          >
                            {size}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              )
            })}
            </div>
          </div>
        )
      })}
      <p className="hint">
        Parts are drawn to scale, with the saw cut left between them. The grain runs along each
        sheet&apos;s length, so parts on a board with grain aren&apos;t turned. It&apos;s a good
        layout, not always the best: a shop&apos;s optimiser may fit more on a sheet. Point at a
        part to see what it is.
      </p>
    </>
  )
}
