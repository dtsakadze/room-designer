import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Piece } from '../types'
import { BOARD, SNAP } from '../lib/defaults'
import { contentBounds } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'
import { CutListPanel } from '../ui/CutListPanel'
import { EditButtons } from '../ui/EditButtons'
import { ShortcutsPanel } from '../ui/ShortcutsPanel'
import { useClashes } from '../ui/useClashes'
import { useUnits } from '../store/useSettingsStore'
import { hasModifier } from '../ui/shortcuts'
import { Dimensions } from './Dimensions'
import { HangingGuides } from './HangingGuides'
import { GridLayer } from './GridLayer'
import { PieceRect } from './PieceRect'
import { ResizeHandles } from './ResizeHandles'
import type { Handle, Rect } from './handles'
import { resizePiece } from './handles'
import {
  VIEWS,
  type ViewName,
  isHollow,
  piecesAt,
  projectPieces,
  showsEdge,
  sizeLabel,
} from './views'

// three.js is big, so the 3D preview only downloads when it's first opened.
const Preview3D = lazy(() => import('./Preview3D'))
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
      mode: 'marquee'
      inverse: DOMMatrix
      startX: number
      startY: number
      /** The part the ⌘-press started on, toggled if the pointer doesn't move. */
      clickedId: string | null
      /** Where the pointer is now; read on release, as state may not have caught up. */
      endX: number
      endY: number
      moved: boolean
    }
  | {
      mode: 'piece'
      inverse: DOMMatrix
      id: string
      startX: number
      startY: number
      originX: number
      originY: number
      /** Only the front view moves pieces; elsewhere a press just selects. */
      editable: boolean
      /** Pieces under the pointer when an already-selected one was pressed. */
      stack: string[] | null
      moved: boolean
    }
  | {
      mode: 'resize'
      inverse: DOMMatrix
      id: string
      /** Set when resizing a whole box rather than one piece. */
      boxId: string | null
      startX: number
      startY: number
      handle: Handle
      origin: Rect
    }

export function Canvas2D() {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [view, setView] = useState<ViewBox>(INITIAL_VIEW)
  const [showCutList, setShowCutList] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [viewName, setViewName] = useState<ViewName>('front')
  /** The selection rectangle being dragged, in SVG coordinates. */
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null,
  )
  const isFront = viewName === 'front'

  const pieces = useDesignStore((s) => s.pieces)
  const selectedId = useDesignStore((s) => s.selectedId)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const select = useDesignStore((s) => s.select)
  const toggleSelect = useDesignStore((s) => s.toggleSelect)
  const selectMany = useDesignStore((s) => s.selectMany)
  const removePieces = useDesignStore((s) => s.removePieces)
  const updatePiece = useDesignStore((s) => s.updatePiece)
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece)
  const beginBatch = useDesignStore((s) => s.beginBatch)
  const endBatch = useDesignStore((s) => s.endBatch)

  const thickness = useDesignStore((s) => s.thickness)
  const clashes = useClashes()
  const { len } = useUnits()
  // What's drawn: the pieces themselves in the front view, read-only
  // projections in the others.
  const shown = useMemo(
    () => projectPieces(pieces, viewName, thickness),
    [pieces, viewName, thickness],
  )
  // See-through panels go underneath everything, so a click on a part inside
  // reaches that part, and a click on bare panel selects the panel.
  const drawn = useMemo(
    () => [
      ...shown.filter((piece) => isHollow(piece, viewName)),
      ...shown.filter((piece) => !isHollow(piece, viewName)),
    ],
    [shown, viewName],
  )

  const unit = view.w / 1400
  const selected = pieces.find((piece) => piece.id === selectedId) ?? null
  const updateBox = useDesignStore((s) => s.updateBox)
  const selectedBox =
    useDesignStore((s) => s.boxes.find((box) => box.id === selected?.boxId)) ?? null
  const selectedShown = shown.find((piece) => piece.id === selectedId) ?? null
  // Handles, gap lines and the like are for one part at a time.
  const single = selectedIds.length <= 1
  const selectedSet = new Set(selectedIds)
  // Selecting any panel of a box selects the whole box.
  const selectedBoxIds = new Set(
    pieces.filter((piece) => selectedSet.has(piece.id) && piece.boxId).map((p) => p.boxId),
  )

  /**
   * ⌘/Ctrl + drag draws a selection rectangle that adds what it touches to the
   * selection. It can start over a part (the back panel covers the whole unit),
   * so a ⌘-press that doesn't move is a ⌘-click on that part instead.
   */
  const beginMarquee = (
    event: ReactPointerEvent<SVGElement>,
    clickedId: string | null,
  ) => {
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    const point = svgPoint(inverse, event.clientX, event.clientY)
    gesture.current = {
      mode: 'marquee',
      inverse,
      startX: point.x,
      startY: point.y,
      clickedId,
      endX: point.x,
      endY: point.y,
      moved: false,
    }
    setHoveredId(null)
    svg.setPointerCapture(event.pointerId)
  }

  /** Dragging empty space pans the view, and pressing it clears the selection. */
  const beginBackground = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 0 && hasModifier(event)) {
      beginMarquee(event, null)
      return
    }
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    const point = svgPoint(inverse, event.clientX, event.clientY)
    if (event.button === 0) select(null)
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

  /**
   * Pressing a part selects it and, in the front view, starts dragging it.
   * Pressing where the selected part is (even under others) keeps it, so it can
   * be dragged; releasing without moving then selects the next part beneath.
   */
  const beginPieceDrag = (event: ReactPointerEvent<SVGRectElement>, clicked: Piece) => {
    // Right-drag pans, even when it starts on a part.
    if (event.button !== 0) return
    event.stopPropagation()
    if (hasModifier(event)) {
      beginMarquee(event, clicked.id)
      return
    }
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    const point = svgPoint(inverse, event.clientX, event.clientY)

    const stack = piecesAt(drawn, point.x, toDesignY(point.y), viewName).map((piece) => piece.id)
    const current = shown.find((piece) => piece.id === selectedId)
    // A see-through panel stays selectable, but pressing a part inside it
    // should grab that part, not the panel.
    const keep = current && stack.includes(current.id) && !isHollow(current, viewName)
    const target = pieces.find((piece) => piece.id === (keep ? current.id : clicked.id))
    if (!target) return
    select(target.id)

    gesture.current = {
      mode: 'piece',
      inverse,
      id: target.id,
      startX: point.x,
      startY: point.y,
      originX: target.x,
      originY: target.y,
      editable: isFront,
      stack: keep ? stack : null,
      moved: false,
    }
    // The whole drag undoes as one step.
    if (isFront) beginBatch()
    setHoveredId(null)
    svg.setPointerCapture(event.pointerId)
  }

  const beginResize = (
    event: ReactPointerEvent<SVGRectElement>,
    handle: Handle,
    target: { id: string; boxId: string | null; origin: Rect },
  ) => {
    event.stopPropagation()
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    const point = svgPoint(inverse, event.clientX, event.clientY)
    gesture.current = {
      mode: 'resize',
      inverse,
      id: target.id,
      boxId: target.boxId,
      startX: point.x,
      startY: point.y,
      handle,
      origin: target.origin,
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

    if (active.mode === 'marquee') {
      const distance = Math.hypot(point.x - active.startX, point.y - active.startY)
      if (!active.moved && distance < unit * 4) return
      active.moved = true
      active.endX = point.x
      active.endY = point.y
      setMarquee({ x1: active.startX, y1: active.startY, x2: point.x, y2: point.y })
      return
    }

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
      const resized = resizePiece(active.origin, active.handle, dx, dy, snap)
      if (active.boxId) updateBox(active.boxId, resized)
      else updatePiece(active.id, resized)
      return
    }

    // A few pixels of wobble is still a click, not a drag.
    if (!active.moved && Math.hypot(dx, dy) < unit * 4) return
    active.moved = true
    if (!active.editable) return
    updatePiece(active.id, {
      x: snap(active.originX + dx),
      y: snap(active.originY + dy),
    })
  }

  const endGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = gesture.current
    if (!active) return
    if (active.mode === 'marquee') {
      if (active.moved) {
        // Everything the rectangle touches, in design coordinates (y up).
        const left = Math.min(active.startX, active.endX)
        const right = Math.max(active.startX, active.endX)
        const bottom = toDesignY(Math.max(active.startY, active.endY))
        const top = toDesignY(Math.min(active.startY, active.endY))
        const hit = drawn.filter(
          (p) => p.x < right && p.x + p.width > left && p.y < top && p.y + p.height > bottom,
        )
        selectMany(
          hit.map((piece) => piece.id),
          true,
        )
      } else if (active.clickedId) {
        // ⌘/Ctrl-click: adds the part to the selection, or takes it out.
        toggleSelect(active.clickedId)
      }
      setMarquee(null)
    }
    if (active.mode === 'resize' || (active.mode === 'piece' && active.editable)) endBatch()
    if (active.mode === 'piece' && active.stack && !active.moved) {
      const next = active.stack[(active.stack.indexOf(active.id) + 1) % active.stack.length]
      select(next)
    }
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

  // ⌘A selects every part; ⌘C / ⌘V copy and paste parts (Ctrl on Windows).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return
      if (!hasModifier(event) || event.shiftKey || event.altKey) return
      // Leave copying selected text on the page to the browser.
      if (window.getSelection()?.toString()) return
      const store = useDesignStore.getState()
      const key = event.key.toLowerCase()
      if (key === 'a') selectMany(store.pieces.map((piece) => piece.id))
      else if (key === 'c' && store.selectedIds.length > 0) store.copySelection()
      else if (key === 'v' && store.canPaste) store.paste()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectMany])

  // Arrow keys nudge the selection; Delete removes it.
  useEffect(() => {
    if (!selectedId) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removePieces(useDesignStore.getState().selectedIds)
        return
      }

      // Duplicating and nudging act on one part at a time.
      if (useDesignStore.getState().selectedIds.length > 1) return

      // Also stops the browser's own ⌘D / Ctrl+D (bookmark this page).
      if (hasModifier(event) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicatePiece(selectedId)
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
      // Nudging moves along the front view's axes, so only there.
      if (!delta || !isFront) return

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
  }, [selectedId, isFront, removePieces, duplicatePiece, updatePiece])

  const fitTo = (list: Piece[]) => {
    const bounds = contentBounds(list)
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
  }

  const switchView = (name: ViewName) => {
    setViewName(name)
    setHoveredId(null)
    // Each view spans different sizes (a 600 deep side vs a 1200 wide front),
    // so frame the unit again.
    fitTo(projectPieces(pieces, name, thickness))
  }

  return (
    <div className="viewport">
      <svg
        ref={svgRef}
        className="canvas"
        // Hidden, not unmounted, in 3D: the wheel listener is bound to this element.
        style={viewName === '3d' ? { display: 'none' } : undefined}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={beginBackground}
        // The right button pans, so its menu would only get in the way.
        onContextMenu={(event) => event.preventDefault()}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <GridLayer view={view} wall={viewName === 'left' || viewName === 'right'} />
        {drawn.map((piece) => (
          <PieceRect
            key={piece.id}
            piece={piece}
            // Selecting any panel of a box selects the whole box.
            selected={
              selectedSet.has(piece.id) || (!!piece.boxId && selectedBoxIds.has(piece.boxId))
            }
            labelled={single && piece.id === selectedId}
            hovered={piece.id === hoveredId}
            label={sizeLabel(piece, viewName, len)}
            editable={isFront}
            hollow={isHollow(piece, viewName)}
            edgeOn={showsEdge(piece, viewName)}
            // Screws show where the shelf meets the sides: from the front or back.
            clashing={clashes.has(piece.id)}
            screws={!!piece.fixed && (viewName === 'front' || viewName === 'back')}
            unit={unit}
            onPointerDown={beginPieceDrag}
            onHoverChange={setHoveredId}
          />
        ))}

        {/* Gaps to neighbours only make sense in the view where you move things. */}
        <Dimensions
          pieces={shown}
          selected={isFront && single ? selectedShown : null}
          unit={unit}
        />

        {/* How far clothes hang below a selected rod, where you see its length. */}
        {single &&
          selectedShown?.kind === 'rod' &&
          (viewName === 'front' || viewName === 'back') && (
          <HangingGuides rod={selectedShown} pieces={shown} unit={unit} />
        )}

        {marquee && (
          <rect
            x={Math.min(marquee.x1, marquee.x2)}
            y={Math.min(marquee.y1, marquee.y2)}
            width={Math.abs(marquee.x2 - marquee.x1)}
            height={Math.abs(marquee.y2 - marquee.y1)}
            fill="#2563eb"
            fillOpacity={0.08}
            stroke="#2563eb"
            strokeWidth={unit}
            strokeDasharray={`${unit * 5} ${unit * 4}`}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Handles go last so they stay clickable above every piece. A box is
            resized as a whole, by handles around its outside. */}
        {isFront && single && selectedBox && (
          <ResizeHandles
            piece={selectedBox}
            unit={unit}
            onPointerDown={(event, handle) =>
              beginResize(event, handle, {
                id: selectedBox.id,
                boxId: selectedBox.id,
                origin: selectedBox,
              })
            }
          />
        )}
        {isFront && single && selected && !selected.boxId && (
          <ResizeHandles
            piece={selected}
            locked={BOARD[selected.kind]?.axis}
            unit={unit}
            onPointerDown={(event, handle) =>
              beginResize(event, handle, { id: selected.id, boxId: null, origin: selected })
            }
          />
        )}
      </svg>

      {viewName === '3d' && (
        <Suspense fallback={<p className="viewport-hint">Loading 3D preview…</p>}>
          <Preview3D />
        </Suspense>
      )}

      <EditButtons />

      <div className="canvas-tools">
        {viewName !== '3d' && (
          <button type="button" className="ghost-button" onClick={() => fitTo(shown)}>
            Fit view
          </button>
        )}
        <button
          type="button"
          className="ghost-button"
          aria-pressed={showCutList}
          onClick={() => setShowCutList((open) => !open)}
        >
          Cut list
        </button>
        <button
          type="button"
          className="ghost-button"
          aria-pressed={showShortcuts}
          onClick={() => setShowShortcuts((open) => !open)}
        >
          Shortcuts
        </button>
      </div>

      {showCutList && <CutListPanel onClose={() => setShowCutList(false)} />}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}

      <div className="view-switcher" role="group" aria-label="View">
        {VIEWS.map(({ name, label }) => (
          <button
            key={name}
            type="button"
            className="ghost-button"
            aria-pressed={viewName === name}
            onClick={() => switchView(name)}
          >
            {label}
          </button>
        ))}
      </div>

      {pieces.length === 0 ? (
        <p className="viewport-hint">Pick a component from the sidebar to start building.</p>
      ) : (
        !isFront && (
          <p className="viewport-hint">
            {viewName === '3d'
              ? 'Drag to rotate, scroll to zoom, right-drag to pan. Edit in Front.'
              : 'View only. Switch to Front to move or resize parts.'}
          </p>
        )
      )}
    </div>
  )
}

const snap = (mm: number) => Math.round(mm / SNAP) * SNAP
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
