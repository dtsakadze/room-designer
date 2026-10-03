import { useEffect, useRef, useState } from 'react'
import type { Piece } from '../types'
import { exportPng, exportSvg } from './exportView'
import type { ViewName } from './views'

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // A click anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (format: 'svg' | 'png') => {
    setOpen(false)
    if (format === 'svg') exportSvg(pieces, view, caption, fileName)
    else void exportPng(pieces, view, caption, fileName)
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
