import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { createPortal } from 'react-dom'
import { PAPER, type PaperSize } from '../lib/drawing'
import { useDesignStore } from '../store/useDesignStore'
import { useProjectsStore } from '../store/useProjectsStore'
import { type PrintOptions, PrintDocument } from './PrintDocument'
import { Segmented } from './Segmented'
import { readPref, writePref } from '../lib/prefs'

const PAPER_KEY = 'room-designer:print-paper'
const LINES_KEY = 'room-designer:print-lines-only'

const storedLinesOnly = () => readPref(LINES_KEY) === 'true'

const storedPaper = (): PaperSize => (readPref(PAPER_KEY) === 'a3' ? 'a3' : 'a4')

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
    <Modal label="Print" className="print-dialog" onClose={onClose}>
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
              writePref(LINES_KEY, String(event.target.checked))
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
          <Segmented
            label="Paper"
            value={options.paper}
            options={(Object.keys(PAPER) as PaperSize[]).map((size) => ({ value: size, text: PAPER[size].label }))}
            onChange={(size) => {
              choose({ paper: size })
              writePref(PAPER_KEY, size)
            }}
          />
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
      {printing && createPortal(<PrintDocument options={options} projectName={projectName} />, document.body)}
    </Modal>
  )
}
