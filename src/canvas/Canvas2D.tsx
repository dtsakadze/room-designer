import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { SNAP } from '../lib/defaults'
import { contentBounds } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'
import { GridLayer } from './GridLayer'
import { PieceRect } from './PieceRect'
import {
  INITIAL_VIEW,
  MAX_VIEW_WIDTH,
  MIN_VIEW_WIDTH,
  type ViewBox,
  screenToSvgMatrix,
  svgPoint,
  toDesignY,
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

export function Canvas2D() {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [view, setView] = useState<ViewBox>(INITIAL_VIEW)

  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const select = useDesignStore((s) => s.select)
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const removePiece = useDesignStore((s) => s.removePiece)

  const unit = view.w / 1400

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

    updatePiece(active.id, {
      x: snap(active.originX + (point.x - active.startX)),
      // SVG y grows down, design y grows up.
      y: snap(active.originY + toDesignY(point.y - active.startY)),
    })
  }

  const endGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!gesture.current) return
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
        const factor = event.deltaY > 0 ? 1.12 : 1 / 1.12
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
            unit={unit}
            onPointerDown={beginPieceDrag}
          />
        ))}
      </svg>

      <div className="canvas-tools">
        <button type="button" className="ghost-button" onClick={fitToContent}>
          Fit view
        </button>
      </div>

      {pieces.length === 0 && (
        <p className="viewport-hint">Pick a component from the sidebar to start building.</p>
      )}
    </div>
  )
}

const snap = (mm: number) => Math.round(mm / SNAP) * SNAP
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
