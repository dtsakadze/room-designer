import { type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Piece } from '../types'
import { SNAP } from '../lib/defaults'
import { type Gap, type Rect, centredGaps, snapToMiddle } from '../lib/geometry'
import { useDesignStore } from '../store/useDesignStore'
import { hasModifier } from '../ui/shortcuts'
import { type Handle, resizePiece } from './handles'
import { type ViewBox, screenToSvgMatrix, svgPoint, toDesignY, wheelZoomFactor, zoomAround } from './view'
import { type ViewName, isHollow, piecesAt, piecesInRect } from './views'

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
      /** Set when the press was on part of a multi-selection, which then moves together. */
      group: string[] | null
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
  | {
      /** Two fingers on a touch screen: zoom by their spread, pan by their middle. */
      mode: 'pinch'
      inverse: DOMMatrix
      startView: ViewBox
      /** The design point between the fingers when they went down. */
      startMid: { x: number; y: number }
      startDistance: number
    }

/** A gesture that changes the design as it goes, so it undoes as one step (`beginBatch`). */
const batched = (gesture: Gesture | null) =>
  gesture?.mode === 'resize' || (gesture?.mode === 'piece' && gesture.editable)

/**
 * Pointer capture throws when the pointer is already gone (a finger lifted
 * between the event and the call, or a touch the browser cancelled), which
 * would crash a drag; the gesture works without it, just less reliably.
 */
function capture(svg: SVGSVGElement, pointerId: number) {
  try {
    svg.setPointerCapture(pointerId)
  } catch {
    // The pointer is gone: nothing to capture.
  }
}

function release(svg: SVGSVGElement | null, pointerId: number) {
  try {
    svg?.releasePointerCapture(pointerId)
  } catch {
    // Already released.
  }
}

type CanvasGestureOptions = {
  svgRef: RefObject<SVGSVGElement | null>
  view: ViewBox
  setView: Dispatch<SetStateAction<ViewBox>>
  viewName: ViewName
  /** The visible parts (doors only while shown), as stored. */
  pieces: Piece[]
  /** What the view draws, and in the order it draws them. */
  shown: Piece[]
  drawn: Piece[]
  /** What a dragged part's gaps and middle snap measure to besides parts: end walls, corner units. */
  obstacles: Rect[]
  /** The size of a screen pixel, in mm. */
  unit: number
  setHoveredId: (id: string | null) => void
}

/**
 * Everything the pointer does on the canvas: panning, pinch and wheel zoom,
 * selecting (with ⌘-click and a selection rectangle), dragging parts (to the
 * grid, and to the middle of their space), and resizing by the handles.
 * Returns the handlers to put on the canvas, its parts and handles, and the
 * selection rectangle and centred gaps to draw.
 */
export function useCanvasGestures({
  svgRef,
  view,
  setView,
  viewName,
  pieces,
  shown,
  drawn,
  obstacles,
  unit,
  setHoveredId,
}: CanvasGestureOptions) {
  const gesture = useRef<Gesture | null>(null)
  /** Where each finger touching the canvas is, in screen pixels, for pinch zoom. */
  const touches = useRef(new Map<number, { x: number; y: number }>())
  /** The selection rectangle being dragged, in SVG coordinates. */
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  /** The equal gaps either side of a part being dragged while it's snapped to the middle. */
  const [centred, setCentred] = useState<Gap[] | null>(null)
  const isFront = viewName === 'front'
  const store = useDesignStore.getState

  /**
   * Starts a gesture from a pointer press: `build` gets the press in SVG
   * coordinates and returns the gesture, or null to start none.
   */
  const start = (
    event: ReactPointerEvent<SVGElement>,
    build: (inverse: DOMMatrix, point: DOMPoint) => Gesture | null,
  ) => {
    const svg = svgRef.current
    const inverse = svg && screenToSvgMatrix(svg)
    if (!svg || !inverse) return
    const next = build(inverse, svgPoint(inverse, event.clientX, event.clientY))
    if (!next) return
    gesture.current = next
    setHoveredId(null)
    capture(svg, event.pointerId)
  }

  /**
   * ⌘/Ctrl + drag draws a selection rectangle that adds what it touches to the
   * selection. It can start over a part (the back panel covers the whole unit),
   * so a ⌘-press that doesn't move is a ⌘-click on that part instead.
   */
  const beginMarquee = (event: ReactPointerEvent<SVGElement>, clickedId: string | null) =>
    start(event, (inverse, point) => ({
      mode: 'marquee',
      inverse,
      startX: point.x,
      startY: point.y,
      clickedId,
      endX: point.x,
      endY: point.y,
      moved: false,
    }))

  /**
   * A second finger turns whatever the first started (a pan, a drag) into a
   * pinch. Runs in the capture phase, before a part under the finger claims it.
   */
  const trackTouch = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'touch') return
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.current.size !== 2) return
    event.stopPropagation()
    start(event, (inverse) => {
      // A drag the first finger started keeps what it did, as one undo step.
      if (batched(gesture.current)) store().endBatch()
      setMarquee(null)
      setCentred(null)
      const [a, b] = [...touches.current.values()]
      return {
        mode: 'pinch',
        inverse,
        startView: view,
        startMid: svgPoint(inverse, (a.x + b.x) / 2, (a.y + b.y) / 2),
        startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      }
    })
  }

  /** Dragging empty space pans the view, and pressing it clears the selection. */
  const beginBackground = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 0 && hasModifier(event)) {
      beginMarquee(event, null)
      return
    }
    start(event, (inverse, point) => {
      if (event.button === 0) store().select(null)
      return { mode: 'pan', inverse, startX: point.x, startY: point.y, startView: view }
    })
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
    start(event, (inverse, point) => {
      const { selectedIds, select, beginBatch } = store()
      const selectedId = selectedIds.at(-1)
      const stack = piecesAt(drawn, point.x, toDesignY(point.y), viewName).map((piece) => piece.id)
      const current = shown.find((piece) => piece.id === selectedId)
      // A see-through panel underneath stays selectable, but pressing a part
      // inside it should grab that part, not the panel. Pressing it again starts
      // over from the top of the stack, so clicking keeps going round.
      const underneath = current && isHollow(current, viewName) && stack.at(-1) === current.id
      const keep = current && stack.includes(current.id) && !underneath
      const target = pieces.find((piece) => piece.id === (keep ? current.id : clicked.id))
      if (!target) return null
      // Pressing a part of a multi-selection keeps the selection, to drag it all.
      const inGroup =
        selectedIds.length > 1 &&
        (selectedIds.includes(target.id) ||
          (!!target.boxId && pieces.some((piece) => piece.boxId === target.boxId && selectedIds.includes(piece.id))))
      if (!inGroup) select(target.id)
      // The whole drag undoes as one step.
      if (isFront) beginBatch()
      return {
        mode: 'piece',
        inverse,
        id: target.id,
        startX: point.x,
        startY: point.y,
        originX: target.x,
        originY: target.y,
        editable: isFront,
        stack: keep ? stack : null,
        group: inGroup ? selectedIds : null,
        moved: false,
      }
    })
  }

  const beginResize = (
    event: ReactPointerEvent<SVGRectElement>,
    handle: Handle,
    target: { id: string; boxId: string | null; origin: Rect },
  ) => {
    // Right-drag pans, even when it starts on a handle, as it does on a part.
    if (event.button !== 0) return
    event.stopPropagation()
    start(event, (inverse, point) => {
      store().beginBatch()
      return { mode: 'resize', inverse, ...target, startX: point.x, startY: point.y, handle }
    })
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const active = gesture.current
    if (!active || !svgRef.current) return
    // The mouse was let go where we didn't hear it (another window, an OS
    // gesture): finish the drag rather than have the part follow the pointer
    // with no button held, and every later change join its undo step.
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      endGesture(event)
      return
    }

    if (active.mode === 'pinch') {
      if (touches.current.size < 2) return
      const [a, b] = [...touches.current.values()]
      const { startView, startMid } = active
      // Zoomed by the fingers' spread around where their middle is now, then
      // moved so the design point that was between them stays between them.
      const mid = svgPoint(active.inverse, (a.x + b.x) / 2, (a.y + b.y) / 2)
      const zoomed = zoomAround(startView, mid, active.startDistance / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)))
      setView({ ...zoomed, x: zoomed.x + startMid.x - mid.x, y: zoomed.y + startMid.y - mid.y })
      return
    }
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
    const { updatePiece, updateBox, movePieces } = store()

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
    const pieceNow = () => store().pieces.find((piece) => piece.id === active.id)
    const target = pieceNow()
    if (!target) return
    if (active.group) {
      // The pressed part snaps to the grid; the rest keep their places around it.
      movePieces(active.group, snap(active.originX + dx) - target.x, snap(active.originY + dy) - target.y)
      return
    }
    const placed = { x: snap(active.originX + dx), y: snap(active.originY + dy) }
    // A loose part snaps to the middle of its space when dragged near it; a
    // box's panel moves its whole box, so it doesn't.
    if (target.boxId) {
      updatePiece(active.id, placed)
      return
    }
    const middle = snapToMiddle({ ...target, ...placed }, shown, obstacles, unit * MIDDLE_SNAP)
    updatePiece(active.id, { x: middle.x, y: middle.y })
    const moved = pieceNow()
    const gaps = moved ? centredGaps(middle, moved) : []
    setCentred(gaps.length > 0 ? gaps : null)
  }

  const endGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    touches.current.delete(event.pointerId)
    const active = gesture.current
    if (!active) return
    gesture.current = null
    release(svgRef.current, event.pointerId)
    // Lifting one finger ends a pinch; the other doesn't start a pan.
    if (active.mode === 'pinch') return
    const { select, selectMany, toggleSelect, endBatch } = store()
    if (active.mode === 'marquee') {
      if (active.moved) {
        const hit = piecesInRect(drawn, { x: active.startX, y: active.startY }, { x: active.endX, y: active.endY })
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
    if (batched(active)) endBatch()
    setCentred(null)
    if (active.mode === 'piece' && active.group && !active.moved) {
      // A click (no drag) on part of a multi-selection selects just that part.
      select(active.id)
    } else if (active.mode === 'piece' && active.stack && !active.moved) {
      select(active.stack[(active.stack.indexOf(active.id) + 1) % active.stack.length])
    }
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
      // Whatever is under the cursor stays pinned in place.
      setView((current) => zoomAround(current, cursor, wheelZoomFactor(event)))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [svgRef, setView])

  // The same function on every render, so parts (memoised) aren't drawn again
  // for every frame of a pan or zoom; it calls the latest one.
  const latestPieceDrag = useRef(beginPieceDrag)
  useLayoutEffect(() => {
    latestPieceDrag.current = beginPieceDrag
  })
  const stablePieceDrag = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, clicked: Piece) => latestPieceDrag.current(event, clicked),
    [],
  )

  return {
    trackTouch,
    beginBackground,
    beginPieceDrag: stablePieceDrag,
    beginResize,
    onPointerMove,
    endGesture,
    marquee,
    centred,
  }
}

const snap = (mm: number) => Math.round(mm / SNAP) * SNAP
/** How near the middle of its space a dragged part snaps to it, in screen pixels (times `unit`). */
const MIDDLE_SNAP = 8
