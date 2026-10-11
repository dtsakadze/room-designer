import { useEffect, useMemo, useRef, useState } from 'react'
import { BOARD } from '../lib/defaults'
import type { Rect } from '../lib/geometry'
import { WALL_LABELS, hasSideWalls, wallLength } from '../lib/room'
import { selectedIdOf, useDesignStore } from '../store/useDesignStore'
import { EditButtons } from '../ui/EditButtons'
import { useClashes } from '../ui/useClashes'
import { useSpanWarnings } from '../ui/useSpanWarnings'
import { useClearanceWarnings } from '../ui/useClearanceWarnings'
import { useRoomOverhangs } from '../ui/useRoomOverhangs'
import { useSettingsStore, useUnits } from '../store/useSettingsStore'
import { Dimensions } from './Dimensions'
import { HangingGuides } from './HangingGuides'
import { HoleLines } from './HoleLines'
import { MiddleGuides } from './MiddleGuides'
import { type EdgeView, SELECTED, edgeOnColor, faceColor } from './colors'
import { useProjectsStore } from '../store/useProjectsStore'
import { fileBase } from '../lib/projectFile'
import { UNITS } from '../lib/units'
import { CeilingLine } from './CeilingLine'
import { GrainPatterns } from './GrainPatterns'
import { GridLayer } from './GridLayer'
import { grainDirection } from '../lib/grain'
import { PieceRect } from './PieceRect'
import { ResizeHandles } from './ResizeHandles'
import { CornerGhosts, RoomWallsFront, RoomWallsPlan } from './RoomWalls'
import { DoorSwings } from './DoorSwings'
import { doorSwings, swingBounds, swingConflicts } from '../lib/swing'
import {
  VIEWS,
  type ViewName,
  cornerGhosts,
  endWalls,
  drawOrder,
  isHollow,
  roomPlan,
  showsEdge,
  sizeLabel,
  viewPieces,
  visiblePieces,
} from './views'
import { Preview3DLoader } from './Preview3DLoader'
import { INITIAL_VIEW, type ViewBox, fitView } from './view'
import { CanvasTools, ViewSwitchers } from './CanvasToolbar'
import { useCanvasGestures } from './useCanvasGestures'
import { useCanvasShortcuts } from './useCanvasShortcuts'
import { useMeasureTool } from './useMeasureTool'

export function Canvas2D() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<ViewBox>(INITIAL_VIEW)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [viewName, setViewName] = useState<ViewName>('front')
  const isFront = viewName === 'front'

  const allPieces = useDesignStore((s) => s.pieces)
  const showDoors = useSettingsStore((s) => s.showDoors)
  const showHangingGuides = useSettingsStore((s) => s.showHangingGuides)
  const grainedBoards = useDesignStore((s) => s.grainedBoards)
  const setShowDoors = useSettingsStore((s) => s.setShowDoors)
  const hasDoors = allPieces.some((piece) => piece.kind === 'door')
  // With doors hidden they're gone from every view and can't be clicked, so
  // the inside can be edited directly. They stay in the cut list and clashes.
  const pieces = useMemo(() => visiblePieces(allPieces, { showDoors }), [allPieces, showDoors])
  const selectedId = useDesignStore(selectedIdOf)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const selectMany = useDesignStore((s) => s.selectMany)

  const thickness = useDesignStore((s) => s.thickness)
  const holePitch = useDesignStore((s) => s.holePitch)
  const boardColors = useDesignStore((s) => s.boardColors)
  const edgeColors = useDesignStore((s) => s.edgeColors)
  const colors = { boardColors, edgeColors }
  const room = useDesignStore((s) => s.room)
  const activeWall = useDesignStore((s) => s.activeWall)
  const setActiveWall = useDesignStore((s) => s.setActiveWall)
  const clashes = useClashes()
  const spanWarnings = useSpanWarnings()
  const clearance = useClearanceWarnings()
  const overhangs = useRoomOverhangs()
  const { len, unit: lengthUnit } = useUnits()
  const projectName = useProjectsStore(
    (s) => s.projects.find((project) => project.id === s.currentId)?.name ?? 'Boardcut',
  )
  const multiWall = hasSideWalls(room)
  // Each wall's unit is edited on its own; the top view shows the whole room.
  const wallPieces = useMemo(() => visiblePieces(pieces, { wall: activeWall }), [pieces, activeWall])
  // What's drawn: the pieces themselves in the front view, read-only
  // projections in the others.
  const shown = useMemo(
    () => viewPieces(pieces, viewName, activeWall, thickness, room),
    [pieces, viewName, activeWall, thickness, room],
  )
  // How each door opens, drawn in the top view.
  const swings = useMemo(
    () => (viewName === 'top' ? doorSwings(pieces, thickness, room) : []),
    [viewName, pieces, thickness, room],
  )
  // Checked against everything, hidden doors included: hiding is only a view.
  const hitting = useMemo(
    () =>
      viewName === 'top'
        ? new Set(swingConflicts(allPieces, thickness, room).keys())
        : new Set<string>(),
    [viewName, allPieces, thickness, room],
  )
  // The room around the wall being edited, in the front view only.
  const inRoom = multiWall && isFront
  const unitDepth = useDesignStore((s) => s.unitDepth)
  const ghosts = useMemo(() => {
    if (!inRoom) return []
    // As deep as this wall's unit, or as deep as one would start.
    const reach = Math.max(unitDepth, ...wallPieces.map((piece) => piece.depth))
    return cornerGhosts(pieces, thickness, room, activeWall, reach)
  }, [inRoom, pieces, wallPieces, thickness, room, activeWall, unitDepth])
  const obstacles = useMemo(
    () => (inRoom ? [...endWalls(room, activeWall), ...ghosts] : []),
    [inRoom, room, activeWall, ghosts],
  )
  // See-through panels go underneath everything, so a click on a part inside
  // reaches that part, and a click on bare panel selects the panel. Doors are
  // nearest, so they go on top.
  const drawn = useMemo(() => drawOrder(shown, viewName), [shown, viewName])

  const unit = view.w / 1400

  const measure = useMeasureTool({ svgRef, viewKey: `${viewName}|${activeWall}`, canMeasure: viewName !== '3d', shown, unit })
  const gestures = useCanvasGestures({ svgRef, view, setView, viewName, pieces, shown, drawn, obstacles, unit, setHoveredId })
  useCanvasShortcuts({ viewName, showDoors, measuring: measure.measuring })

  // What the view shows, in words: "Front", or "Left wall, front" in a room.
  const viewLabel = VIEWS.find((candidate) => candidate.name === viewName)?.label ?? ''
  const viewTitle =
    multiWall && viewName !== 'top' ? `${WALL_LABELS[activeWall]}, ${viewLabel.toLowerCase()}` : viewLabel
  const selected = pieces.find((piece) => piece.id === selectedId) ?? null
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

  // A selection can span walls only while the top view shows the whole room.
  useEffect(() => {
    useDesignStore.getState().setWholeRoomShown(viewName === 'top')
  }, [viewName])

  /** Hiding doors lets go of any that are selected, so nothing unseen can be deleted or moved. */
  const toggleDoors = () => {
    if (showDoors) {
      const doors = new Set(allPieces.filter((p) => p.kind === 'door').map((p) => p.id))
      if (selectedIds.some((id) => doors.has(id))) {
        selectMany(selectedIds.filter((id) => !doors.has(id)))
      }
    }
    setShowDoors(!showDoors)
  }

  // Picking a door some other way (the Parts list) while doors are hidden
  // shows them again, rather than selecting something that isn't drawn.
  const doorSelected = allPieces.some((piece) => piece.kind === 'door' && selectedIds.includes(piece.id))
  useEffect(() => {
    if (doorSelected && !showDoors) setShowDoors(true)
  }, [doorSelected, showDoors, setShowDoors])

  const fitTo = (list: Rect[]) => setView(fitView(list))

  /** What a view should frame: its parts, and in a room, the wall or room around them. */
  const framed = (name: ViewName, wall = activeWall) => {
    if (name === 'top') {
      // Room for the doors to swing open, too.
      const plan = [
        ...roomPlan(pieces, thickness, room),
        ...doorSwings(pieces, thickness, room).map(swingBounds),
      ]
      if (!multiWall) return plan
      return [...plan, { x: -room.width / 2, y: -room.depth, width: room.width, height: room.depth }]
    }
    const list: Rect[] = viewPieces(pieces, name, wall, thickness, room)
    if (!multiWall || name !== 'front') return list
    const half = wallLength(room, wall) / 2
    return [...list, { x: -half, y: 0, width: 2 * half, height: WALL_FRAME_HEIGHT }]
  }

  const switchView = (name: ViewName) => {
    setViewName(name)
    setHoveredId(null)
    // Each view spans different sizes (a 600 deep side vs a 1200 wide front),
    // so frame the unit again.
    fitTo(framed(name))
  }

  // Moving to another wall (with the wall switch, or by selecting a part on
  // it) frames that wall. The top and 3D views show every wall, so they stay.
  // Done while rendering rather than in an effect, so the old wall's framing
  // never shows for a frame.
  const [framedWall, setFramedWall] = useState(activeWall)
  if (framedWall !== activeWall) {
    setFramedWall(activeWall)
    setHoveredId(null)
    if (viewName !== 'top' && viewName !== '3d') fitTo(framed(viewName, activeWall))
  }

  const { marquee, centred } = gestures

  return (
    <div className="viewport">
      <svg
        ref={svgRef}
        className="canvas"
        // Hidden, not unmounted, in 3D: the wheel listener is bound to this element.
        style={viewName === '3d' ? { display: 'none' } : undefined}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDownCapture={gestures.trackTouch}
        onPointerDown={gestures.beginBackground}
        // The right button pans, so its menu would only get in the way.
        onContextMenu={(event) => event.preventDefault()}
        onPointerMove={gestures.onPointerMove}
        onPointerUp={gestures.endGesture}
        onPointerCancel={gestures.endGesture}
        // The browser took the pointer away without a pointerup.
        onLostPointerCapture={gestures.endGesture}
      >
        <GrainPatterns unit={unit} />
        <GridLayer view={view} wall={viewName === 'left' || viewName === 'right'} />
        {inRoom && (
          <RoomWallsFront room={room} wall={activeWall} view={view} unit={unit} />
        )}
        {room.height !== undefined && isFront && (
          <CeilingLine
            height={room.height}
            top={wallPieces.length ? Math.max(...wallPieces.map((p) => p.y + p.height)) : null}
            view={view}
            unit={unit}
          />
        )}
        {multiWall && viewName === 'top' && <RoomWallsPlan room={room} unit={unit} />}
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
            fill={
              showsEdge(piece, viewName)
                ? edgeOnColor(piece, viewName as EdgeView, colors)
                : faceColor(piece, colors)
            }
            // Screws show where the shelf meets the sides: from the front or back.
            clashing={clashes.has(piece.id)}
            warned={spanWarnings.has(piece.id) || clearance.has(piece.id) || overhangs.has(piece.id)}
            grain={grainDirection(piece, viewName, grainedBoards)}
            screws={!!piece.fixed && (viewName === 'front' || viewName === 'back')}
            // From behind, a door's hinges would show on the wrong side.
            doorMarks={isFront}
            unit={unit}
            onPointerDown={gestures.beginPieceDrag}
            onHoverChange={setHoveredId}
          />
        ))}

        {/* Where adjustable shelves can go: ticks from the front, dots on the sides' faces. */}
        {(isFront || viewName === 'left' || viewName === 'right') && (
          <HoleLines pieces={wallPieces} shown={shown} view={viewName} pitch={holePitch} unit={unit} />
        )}
        {inRoom && <CornerGhosts ghosts={ghosts} unit={unit} />}
        {swings.length > 0 && <DoorSwings swings={swings} selected={selectedSet} hitting={hitting} unit={unit} />}

        {/* Gaps to neighbours only make sense in the view where you move things. */}
        <Dimensions
          pieces={shown}
          selected={isFront && single ? selectedShown : null}
          obstacles={obstacles}
          unit={unit}
        />

        {centred && <MiddleGuides gaps={centred} unit={unit} />}

        {/* How far clothes hang below a selected rod, where you see its length. */}
        {showHangingGuides &&
          single &&
          selectedShown?.kind === 'rod' &&
          (viewName === 'front' || viewName === 'back') && (
          <HangingGuides rod={selectedShown} pieces={shown} unit={unit} />
        )}

        {measure.layer(view)}

        {marquee && (
          <rect
            x={Math.min(marquee.x1, marquee.x2)}
            y={Math.min(marquee.y1, marquee.y2)}
            width={Math.abs(marquee.x2 - marquee.x1)}
            height={Math.abs(marquee.y2 - marquee.y1)}
            fill={SELECTED}
            fillOpacity={0.08}
            stroke={SELECTED}
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
              gestures.beginResize(event, handle, {
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
              gestures.beginResize(event, handle, { id: selected.id, boxId: null, origin: selected })
            }
          />
        )}
      </svg>

      {viewName === '3d' && (
        <Preview3DLoader />
      )}

      <EditButtons />

      <CanvasTools
        viewName={viewName}
        hasDoors={hasDoors}
        showDoors={showDoors}
        onToggleDoors={toggleDoors}
        measuring={measure.measuring}
        onToggleMeasuring={measure.toggle}
        shown={shown}
        caption={`${projectName} · ${viewTitle} · sizes in ${UNITS[lengthUnit].label}`}
        fileName={`${fileBase(projectName) || 'boardcut'} ${viewTitle.toLowerCase()}`}
        onFit={() => fitTo([...shown, ...swings.map(swingBounds)])}
      />

      <ViewSwitchers viewName={viewName} onView={switchView} room={room} activeWall={activeWall} onWall={setActiveWall} />

      {allPieces.length === 0 ? (
        <p className="viewport-hint">Pick a component from the sidebar to start building, or start from a template under Projects.</p>
      ) : (
        !isFront && (
          <p className="viewport-hint">
            {viewName === '3d'
              ? `Drag to rotate, scroll to zoom, right-drag to pan.${multiWall ? ' Shows every wall.' : ''} Edit in Front.`
              : viewName === 'top' && multiWall
                ? 'The whole room, from above. Edit in Front.'
                : 'View only. Switch to Front to move or resize parts.'}
          </p>
        )
      )}
    </div>
  )
}

/** How much of a wall's height to frame when it's shown, in mm. */
const WALL_FRAME_HEIGHT = 2400
