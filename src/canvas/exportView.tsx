import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { contentBounds } from '../lib/geometry'
import { downloadFile } from '../lib/projectFile'
import type { Piece } from '../types'
import { PrintDrawing } from './PrintDrawing'
import type { ViewName } from './views'

/** Exported drawings are 1:10, so an SVG's mm are real-world cm. */
const SCALE = 10
/** Paper left round the drawing for its dimension lines and caption, in mm. */
const MARGIN = 26
/** CSS pixels per mm, for sizing the PNG. */
const PX_PER_MM = 96 / 25.4
/** PNGs are drawn this many times larger than the SVG's size, to stay sharp. */
const PNG_ZOOM = 3

/**
 * The clean drawing of a view (the same as a printed page: outlines,
 * dimensions, no colours or handles) as SVG markup, with its size in mm.
 * Null when there's nothing in the view.
 */
export function viewSvg(pieces: Piece[], view: ViewName, caption: string) {
  const bounds = contentBounds(pieces)
  if (!bounds) return null
  const area = {
    width: (bounds.maxX - bounds.minX) / SCALE + 2 * MARGIN,
    height: (bounds.maxY - bounds.minY) / SCALE + 2 * MARGIN,
  }
  // Rendered off-screen and read back, so it's exactly what printing draws.
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => {
    root.render(<PrintDrawing pieces={pieces} view={view} scale={SCALE} area={area} caption={caption} />)
  })
  const markup = host.innerHTML
  root.unmount()
  return { markup: `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`, ...area }
}

/** Downloads a view's drawing as an SVG file. */
export function exportSvg(pieces: Piece[], view: ViewName, caption: string, fileName: string) {
  const drawing = viewSvg(pieces, view, caption)
  if (drawing) downloadFile(drawing.markup, `${fileName}.svg`, 'image/svg+xml')
}

/** Downloads a view's drawing as a PNG on white, a few times screen size so it prints sharp. */
export async function exportPng(pieces: Piece[], view: ViewName, caption: string, fileName: string) {
  const drawing = viewSvg(pieces, view, caption)
  if (!drawing) return
  const width = Math.round(drawing.width * PX_PER_MM * PNG_ZOOM)
  const height = Math.round(drawing.height * PX_PER_MM * PNG_ZOOM)
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.markup)}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (blob) downloadFile(blob, `${fileName}.png`, 'image/png')
}
