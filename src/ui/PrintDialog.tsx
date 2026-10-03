import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PAPER, type PaperSize } from '../lib/drawing'
import { useDesignStore } from '../store/useDesignStore'
import { useProjectsStore } from '../store/useProjectsStore'
import { type PrintOptions, PrintDocument } from './PrintDocument'

const PAPER_KEY = 'room-designer:print-paper'
const LINES_KEY = 'room-designer:print-lines-only'

const storedLinesOnly = () => {
  try {
    return localStorage.getItem(LINES_KEY) === 'true'
  } catch {
    return false
  }
}

const storedPaper = (): PaperSize => {
  try {
    return localStorage.getItem(PAPER_KEY) === 'a3' ? 'a3' : 'a4'
  } catch {
    return 'a4'
  }
}

/**
 * Asks what to print (the drawings, the cut list or both) and on which paper,
 * then prints through the browser, where "Save as PDF" makes a file. The
 * pages are drawn only while printing, outside the app, so the screen stays
 * as it is.
 */
export function PrintDialog({ onClose }: { onClose: () => void }) {
  const isEmpty = useDesignStore((s) => s.pieces.length === 0)
  const projectName = useProjectsStore(
    (s) => s.projects.find((project) => project.id === s.currentId)?.name ?? 'Boardcut',
  )
  const [options, setOptions] = useState<PrintOptions>(() => ({
    drawings: true,
    cutList: true,
    paper: storedPaper(),
    linesOnly: storedLinesOnly(),
  }))
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Once the pages are in the document, open the browser's print dialog;
  // when it's done (printed or cancelled), take them out again.
  useEffect(() => {
    if (!printing) return
    const done = () => {
      setPrinting(false)
      onClose()
    }
    window.addEventListener('afterprint', done, { once: true })
    // After this commit, so the pages are laid out; a timer rather than an
    // animation frame, which background tabs never get.
    const timer = setTimeout(() => window.print(), 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', done)
    }
  }, [printing, onClose])

  const choose = (patch: Partial<PrintOptions>) => setOptions((current) => ({ ...current, ...patch }))
  const nothing = !options.drawings && !options.cutList

  return (
    <div className="overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="projects-panel print-dialog" role="dialog" aria-label="Print">
        <h2>Print</h2>
        <div className="stack">
          <label className="checkbox">
            <input type="checkbox" checked={options.drawings} onChange={(event) => choose({ drawings: event.target.checked })} />
            Drawings: front, side and top, to scale with dimensions
          </label>
          <label className="checkbox print-suboption">
            <input
              type="checkbox"
              checked={options.linesOnly}
              disabled={!options.drawings}
              onChange={(event) => {
                choose({ linesOnly: event.target.checked })
                try {
                  localStorage.setItem(LINES_KEY, String(event.target.checked))
                } catch {
                  // Still used for this print.
                }
              }}
            />
            Lines only, no shading (saves ink)
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={options.cutList} onChange={(event) => choose({ cutList: event.target.checked })} />
            Cut list and hardware
          </label>
          <div className="field">
            <span className="field-label">Paper</span>
            <span className="unit-switch" role="radiogroup" aria-label="Paper">
              {(Object.keys(PAPER) as PaperSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={options.paper === size}
                  onClick={() => {
                    choose({ paper: size })
                    try {
                      localStorage.setItem(PAPER_KEY, size)
                    } catch {
                      // Still used for this print.
                    }
                  }}
                >
                  {PAPER[size].label}
                </button>
              ))}
            </span>
          </div>
          <p className="hint">
            Landscape. To get a PDF, choose Save as PDF as the printer.
          </p>
          {isEmpty && <p className="hint hint-error">Nothing to print yet: add some parts first.</p>}
        </div>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="add-button"
            autoFocus
            disabled={isEmpty || nothing || printing}
            onClick={() => setPrinting(true)}
          >
            Print…
          </button>
        </div>
      </div>
      {printing && createPortal(<PrintDocument options={options} projectName={projectName} />, document.body)}
    </div>
  )
}
