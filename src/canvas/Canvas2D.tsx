import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { SNAP } from '../lib/defaults'
import { contentBounds } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'
import { CutListPanel } from '../ui/CutListPanel'
import { HistoryButtons } from '../ui/HistoryButtons'
import { Dimensions } from './Dimensions'
import { GridLayer } from './GridLayer'
import { PieceRect } from './PieceRect'
import { ResizeHandles } from './ResizeHandles'
import type { Handle } from './handles'
import { resizePiece } from './handles'
import {
  INITIAL_VIEW,
  MAX_VIEW_WIDTH,
  MIN_VIEW_WIDTH,
  type ViewBox,
  screenToSvgMatrix,
  svgPoint,
  toDesignY,
  wheelZoomFactor,
} from './view'

type Gesture =
  | { mode: 'pan'; inverse: DOMMatrix; startX: number; startY: number; startView: ViewBox }
  | {
      mode: 'piece'
      inverse: DOMMatrix
      id: string
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | {
      mode: 'resize'
      inverse: DOMMatrix
      id: string
      startX: number
      startY: number
      handle: Handle
      origin: Piece
    }

export function Canvas2D() {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [view, setView] = useState<ViewBox>(INITIAL_VIEW)
  const [showCutList, setShowCutList] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const select = useDesignStore((s) => s.select)
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const removePiece = useDesignStore((s) => s.removePiece)
  const beginBatch = useDesignStore((s) => s.beginBatch)
  const endBatch = useDesignStore((s) => s.endBatch)

  const unit = view.w / 1400
  const selected = pieces.find((piece) => piece.id === selectedId) ?? null

  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    select(null)
    const point = svgPoint(inverse, event.clientX, event.clientY)
    gesture.current = {
      mode: 'pan',
      inverse,
      startX: point.x,
      startY: point.y,
      startView: view,
    }
    setHoveredId(null)
    svg.setPointerCapture(event.pointerId)
  }

  const beginPieceDrag = (event: ReactPointerEvent<SVGRectElement>, piece: Piece) => {
    event.stopPropagation()
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    select(piece.id)
    const point = svgPoint(inverse, event.clientX, event.clientY)
    gesture.current = {
      mode: 'piece',
      inverse,
      id: piece.id,
      startX: point.x,
      startY: point.y,
      originX: piece.x,
      originY: piece.y,
    }
    // The whole drag undoes as one step.
    beginBatch()
    setHoveredId(null)
    svg.setPointerCapture(event.pointerId)
  }

  const beginResize = (event: ReactPointerEvent<SVGRectElement>, handle: Handle, piece: Piece) => {
    event.stopPropagation()
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    const point = svgPoint(inverse, event.clientX, event.clientY)
    gesture.current = {
      mode: 'resize',
      inverse,
      id: piece.id,
      startX: point.x,
      startY: point.y,
      handle,
      origin: piece,
    }
    beginBatch()
    setHoveredId(null)
    svg.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = gesture.current
    const svg = svgRef.current
    if (!active || !svg) return
    const point = svgPoint(active.inverse, event.clientX, event.clientY)

    if (active.mode === 'pan') {
      setView({
        ...active.startView,
        x: active.startView.x + (active.startX - point.x),
        y: active.startView.y + (active.startY - point.y),
      })
      return
    }

    // SVG y grows down, design y grows up.
    const dx = point.x - active.startX
    const dy = toDesignY(point.y - active.startY)

    if (active.mode === 'resize') {
      updatePiece(active.id, resizePiece(active.origin, active.handle, dx, dy, snap))
      return
    }

    updatePiece(active.id, {
      x: snap(active.originX + dx),
      y: snap(active.originY + dy),
    })
  }

  const endGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!gesture.current) return
    if (gesture.current.mode !== 'pan') endBatch()
    gesture.current = null
    svgRef.current?.releasePointerCapture(event.pointerId)
  }

  // Wheel must be a non-passive native listener so the gesture can be claimed.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const inverse = screenToSvgMatrix(svg)
      if (!inverse) return
      const cursor = svgPoint(inverse, event.clientX, event.clientY)

      setView((current) => {
        const factor = wheelZoomFactor(event)
        const w = clamp(current.w * factor, MIN_VIEW_WIDTH, MAX_VIEW_WIDTH)
        const ratio = w / current.w
        const h = current.h * ratio
        return {
          w,
          h,
          // Keep whatever is under the cursor pinned in place.
          x: cursor.x - (cursor.x - current.x) * ratio,
          y: cursor.y - (cursor.y - current.y) * ratio,
        }
      })
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  // Arrow keys nudge the selection; Delete removes it.
  useEffect(() => {
    if (!selectedId) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removePiece(selectedId)
        return
      }

      const step = event.shiftKey ? SNAP * 10 : SNAP
      const nudge: Record<string, { x?: number; y?: number }> = {
        ArrowLeft: { x: -step },
        ArrowRight: { x: step },
        ArrowUp: { y: step },
        ArrowDown: { y: -step },
      }
      const delta = nudge[event.key]
      if (!delta) return

      event.preventDefault()
      const piece = useDesignStore.getState().pieces.find((p) => p.id === selectedId)
      if (!piece) return
      updatePiece(selectedId, {
        x: piece.x + (delta.x ?? 0),
        y: piece.y + (delta.y ?? 0),
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, removePiece, updatePiece])

  const fitToContent = useCallback(() => {
    const bounds = contentBounds(useDesignStore.getState().pieces)
    if (!bounds) {
      setView(INITIAL_VIEW)
      return
    }
    const margin = 300
    const w = Math.max(MIN_VIEW_WIDTH, bounds.maxX - bounds.minX + margin * 2)
    const h = Math.max(MIN_VIEW_WIDTH, bounds.maxY - bounds.minY + margin * 2)
    setView({
      x: bounds.minX - margin,
      y: -(bounds.maxY + margin),
      w,
      h,
    })
  }, [])

  return (
    <div className="viewport">
      <svg
        ref={svgRef}
        className="canvas"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={beginPan}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <GridLayer view={view} />
        {pieces.map((piece) => (
          <PieceRect
            key={piece.id}
            piece={piece}
            selected={piece.id === selectedId}
            hovered={piece.id === hoveredId}
            unit={unit}
            onPointerDown={beginPieceDrag}
            onHoverChange={setHoveredId}
          />
        ))}

        <Dimensions pieces={pieces} selected={selected} unit={unit} />

        {/* Handles go last so they stay clickable above every piece. */}
        {selected && (
          <ResizeHandles
            piece={selected}
            unit={unit}
            onPointerDown={(event, handle) => beginResize(event, handle, selected)}
          />
        )}
      </svg>

      <HistoryButtons />

      <div className="canvas-tools">
        <button type="button" className="ghost-button" onClick={fitToContent}>
          Fit view
        </button>
        <button
          type="button"
          className="ghost-button"
          aria-pressed={showCutList}
          onClick={() => setShowCutList((open) => !open)}
        >
          Cut list
        </button>
      </div>

      {showCutList && <CutListPanel onClose={() => setShowCutList(false)} />}

      {pieces.length === 0 && (
        <p className="viewport-hint">Pick a component from the sidebar to start building.</p>
      )}
    </div>
  )
}

const snap = (mm: number) => Math.round(mm / SNAP) * SNAP
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
