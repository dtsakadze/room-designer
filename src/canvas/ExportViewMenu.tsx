import type { Piece } from '../types'
import { exportPng, exportSvg } from './exportView'
import type { ViewName } from './views'
import { useMenu } from '../ui/useMenu'

type ExportViewMenuProps = {
  /** The parts as the view shows them. */
  pieces: Piece[]
  view: ViewName
  /** Under the drawing: the project, the view and the units. */
  caption: string
  /** The file's name, without its extension. */
  fileName: string
}

/**
 * Exports the view on screen as a clean drawing, the same as its printed
 * page, as SVG (for drawing programs and laser cutters) or PNG (for messages
 * and documents).
 */
export function ExportViewMenu({ pieces, view, caption, fileName }: ExportViewMenuProps) {
  const { open, setOpen, ref } = useMenu<HTMLDivElement>()

  const choose = (format: 'svg' | 'png') => {
    setOpen(false)
    if (format === 'svg') exportSvg(pieces, view, caption, fileName)
    else {
      exportPng(pieces, view, caption, fileName).catch((error: unknown) => {
        console.error('PNG export failed', error)
        window.alert("The PNG couldn't be made in this browser. Try SVG instead.")
      })
    }
  }

  return (
    <div className="export-view" ref={ref}>
      <button
        type="button"
        className="ghost-button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pieces.length === 0}
        onClick={() => setOpen(!open)}
      >
        Export view
      </button>
      {open && (
        <div className="export-view-menu" role="menu" aria-label="Export view">
          <button type="button" role="menuitem" className="ghost-button" onClick={() => choose('svg')}>
            SVG <span className="muted">drawing programs</span>
          </button>
          <button type="button" role="menuitem" className="ghost-button" onClick={() => choose('png')}>
            PNG <span className="muted">image</span>
          </button>
        </div>
      )}
    </div>
  )
}
