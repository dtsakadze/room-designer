import { PrintDrawing } from '../canvas/PrintDrawing'
import { type ViewName, projectPieces, roomPlan } from '../canvas/views'
import { PAPER, type PaperSize, fitScale } from '../lib/drawing'
import { contentBounds } from '../lib/geometry'
import { WALL_LABELS, activeWalls, hasSideWalls, wallOf } from '../lib/room'
import { UNITS } from '../lib/units'
import { useDesignStore } from '../store/useDesignStore'
import { useUnits } from '../store/useSettingsStore'
import type { Piece } from '../types'
import { CutListTables } from './CutListPanel'

export type PrintOptions = {
  drawings: boolean
  cutList: boolean
  paper: PaperSize
  /** Drawings in outlines only, without shading cut edges and faces. */
  linesOnly: boolean
}

/** Paper left round the page's edge, and taken by the title block under a drawing, in mm. */
const PAGE_MARGIN = 10
const TITLE_HEIGHT = 14
/** Room round a drawing for its dimension lines, in mm of paper. */
const DIMENSION_ROOM = 22

/** One drawing to print: what it shows and which view of it. */
type Sheet = { title: string; view: ViewName; pieces: Piece[] }

/**
 * What gets printed: a page per view (front and side of each wall's unit,
 * then the top of the whole room), each drawn to scale with its dimensions
 * and a title block, then the cut list. Only shown when printing.
 */
export function PrintDocument({ options, projectName }: { options: PrintOptions; projectName: string }) {
  const pieces = useDesignStore((s) => s.pieces)
  const thickness = useDesignStore((s) => s.thickness)
  const room = useDesignStore((s) => s.room)
  const { unit } = useUnits()
  const paper = PAPER[options.paper]
  const area = {
    width: paper.width - 2 * PAGE_MARGIN,
    height: paper.height - 2 * PAGE_MARGIN - TITLE_HEIGHT,
  }
  const date = new Date().toLocaleDateString()

  const multiWall = hasSideWalls(room)
  const sheets: Sheet[] = options.drawings
    ? [
        ...activeWalls(room).flatMap((wall): Sheet[] => {
          const onWall = pieces.filter((piece) => wallOf(piece) === wall)
          if (onWall.length === 0) return []
          const prefix = multiWall ? `${WALL_LABELS[wall]}: ` : ''
          return [
            { title: `${prefix}Front`, view: 'front', pieces: projectPieces(onWall, 'front', thickness) },
            { title: `${prefix}Side, from the left`, view: 'left', pieces: projectPieces(onWall, 'left', thickness) },
          ]
        }),
        { title: multiWall ? 'Top, the whole room' : 'Top', view: 'top', pieces: roomPlan(pieces, thickness, room) },
      ]
    : []

  return (
    <div className="print-document">
      {/* The page size follows the paper chosen; the margin is the pages' own padding. */}
      <style>{`@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }`}</style>
      {sheets.map((sheet, index) => {
        const bounds = contentBounds(sheet.pieces)
        if (!bounds) return null
        const scale = fitScale(
          { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY },
          area,
          DIMENSION_ROOM,
        )
        return (
          <section key={index} className="print-page" style={{ width: `${paper.width}mm`, height: `${paper.height}mm` }}>
            <PrintDrawing pieces={sheet.pieces} view={sheet.view} scale={scale} area={area} linesOnly={options.linesOnly} />
            <TitleBlock project={projectName} title={sheet.title} details={[`Scale 1:${scale}`, `Sizes in ${UNITS[unit].label}`, date]} />
          </section>
        )
      })}
      {options.cutList && (
        <section className="print-page print-flow" style={{ width: `${paper.width}mm` }}>
          <TitleBlock project={projectName} title="Cut list" details={[date]} />
          <div className="cut-list print-cut-list">
            <CutListTables />
          </div>
        </section>
      )}
    </div>
  )
}

/** The strip naming a page: the project, what the page shows, and its scale, units and date. */
function TitleBlock({ project, title, details }: { project: string; title: string; details: string[] }) {
  return (
    <footer className="print-title">
      <strong>{project}</strong>
      <span>{title}</span>
      <span className="print-title-details">{details.join(' · ')}</span>
    </footer>
  )
}
