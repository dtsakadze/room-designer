import type { Box, Piece, PieceKind } from '../types'
import { withBoxPanels } from './box'
import { DEFAULT_THICKNESS, createPiece } from './defaults'
import { normalizePiece } from './geometry'
import { type ProjectData, toProjectData } from './project'
import { DEFAULT_HOLE_PITCH, isAdjustable, snapToHoles } from './shelfPins'

/** A ready-made design to start a project from. */
export type Template = {
  id: string
  name: string
  /** One line on what it is, for the picker. */
  description: string
  build: () => ProjectData
}

const T = DEFAULT_THICKNESS
const SIDE = T.body

/** The parts of a design being put together; a box's panels are worked out when it's done. */
class Builder {
  pieces: Piece[] = []
  boxes: Box[] = []
  private count = 0

  private readonly id: string
  private readonly unitDepth: number

  constructor(id: string, unitDepth: number) {
    this.id = id
    this.unitDepth = unitDepth
  }

  /** A carcass sized as one, standing on the floor. */
  box(x: number, width: number, height: number, depth: number) {
    this.boxes.push({ id: `${this.id}-box${this.boxes.length}`, x, y: 0, width, height, depth, joint: 'between' })
  }

  /** A part of the given kind, sized and placed by `rect`, with any other options. */
  add(kind: PieceKind, rect: Partial<Piece>, options: Partial<Piece> = {}) {
    const base = createPiece(kind, `${this.id}-${++this.count}`, T, this.unitDepth)
    this.pieces.push(normalizePiece({ ...base, ...rect, ...options }, T))
  }

  /** A divider standing on the bottom board, from the inside bottom to the inside top. */
  divider(x: number, height: number) {
    this.add('divider', { x, y: SIDE, height: height - 2 * SIDE })
  }

  /** Adjustable shelves at these heights, across a bay, resting on the holes nearest each height. */
  shelves(x: number, width: number, heights: number[]) {
    for (const y of heights) this.add('shelf', { x, y, width })
  }

  /** A hanging rod across a bay, `y` up to its underside. */
  rod(x: number, width: number, y: number) {
    this.add('rod', { x, y, width, height: 25 })
  }

  finish(): ProjectData {
    const panelled = withBoxPanels(this.pieces, this.boxes, T)
    // Adjustable shelves go on the holes drilled for them.
    const pieces = panelled.map((piece) =>
      isAdjustable(piece) ? { ...piece, y: snapToHoles(piece, panelled, DEFAULT_HOLE_PITCH) } : piece,
    )
    return toProjectData({ pieces, boxes: this.boxes, thickness: T, unitDepth: this.unitDepth })
  }
}

/** Half of a 1200 mm wardrobe, inside, either side of a centre divider. */
const BAY = (1200 - 2 * SIDE - SIDE) / 2

export const TEMPLATES: Template[] = [
  {
    id: 'two-door-wardrobe',
    name: 'Two-door wardrobe',
    description: '1200 × 2000: hanging space on one side, shelves on the other, behind double doors.',
    build() {
      const b = new Builder(this.id, 600)
      b.box(-600, 1200, 2000, 600)
      b.divider(-SIDE / 2, 2000)
      b.rod(-600 + SIDE, BAY, 1750)
      b.shelves(-600 + SIDE, BAY, [1850])
      b.shelves(SIDE / 2, BAY, [300, 600, 900, 1200, 1500, 1850])
      b.add('door', { x: -600, y: 0, width: 1200, height: 2000 }, { double: true })
      return b.finish()
    },
  },
  {
    id: 'sliding-wardrobe',
    name: 'Sliding-door wardrobe',
    description: '1800 × 2200: a hanging bay and two bays of shelves, behind two sliding doors.',
    build() {
      const b = new Builder(this.id, 600)
      // Three bays of 576 mm either side of two dividers.
      const bay = (1800 - 2 * SIDE - 2 * SIDE) / 3
      const first = -900 + SIDE
      const second = first + bay + SIDE
      const third = second + bay + SIDE
      b.box(-900, 1800, 2200, 600)
      b.divider(first + bay, 2200)
      b.divider(second + bay, 2200)
      b.rod(first, bay, 1950)
      b.shelves(first, bay, [2050])
      b.shelves(second, bay, [400, 800, 1200, 1600, 2050])
      b.shelves(third, bay, [350, 700, 1050, 1400, 1750, 2050])
      b.add('door', { x: -900, y: 0, width: 1800, height: 2200 }, { sliding: 2 })
      return b.finish()
    },
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    description: '700 × 1800 and 300 deep: an open unit with four adjustable shelves.',
    build() {
      const b = new Builder(this.id, 300)
      b.box(-350, 700, 1800, 300)
      b.shelves(-350 + SIDE, 700 - 2 * SIDE, [350, 700, 1050, 1400])
      return b.finish()
    },
  },
  {
    id: 'closet-drawers',
    name: 'Closet with drawers',
    description: '1200 × 2000: hanging space on one side, three drawers and shelves on the other.',
    build() {
      const b = new Builder(this.id, 600)
      b.box(-600, 1200, 2000, 600)
      b.divider(-SIDE / 2, 2000)
      b.rod(-600 + SIDE, BAY, 1750)
      b.shelves(-600 + SIDE, BAY, [1850])
      for (const y of [SIDE, SIDE + 200, SIDE + 400]) {
        b.add('drawer', { x: SIDE / 2, y, width: BAY, height: 200 })
      }
      b.shelves(SIDE / 2, BAY, [800, 1200, 1600])
      return b.finish()
    },
  },
  {
    id: 'hall-unit',
    name: 'Hall unit',
    description: '1000 × 2100 and 400 deep: a coat rail with a shoe shelf, and shoe shelves and shelves beside it.',
    build() {
      const b = new Builder(this.id, 400)
      const bay = (1000 - 3 * SIDE) / 2
      const left = -500 + SIDE
      const right = left + bay + SIDE
      b.box(-500, 1000, 2100, 400)
      b.divider(left + bay, 2100)
      // Coats on the left, over a shoe shelf, with a hat shelf above.
      b.add('accessory', { x: left, y: 60, width: bay }, { accessory: 'shoes-angled', height: 150, depth: 350 })
      b.rod(left, bay, 1950)
      b.shelves(left, bay, [2050])
      // Shoes below and shelves above on the right.
      for (const y of [60, 260, 460]) {
        b.add('accessory', { x: right, y, width: bay }, { accessory: 'shoes-angled', height: 150, depth: 350 })
      }
      b.shelves(right, bay, [800, 1200, 1600, 2050])
      return b.finish()
    },
  },
]

/** The template's name, or with a number after it when a project already has that name. */
export function projectNameFor(template: Template, taken: string[]) {
  if (!taken.includes(template.name)) return template.name
  let n = 2
  while (taken.includes(`${template.name} ${n}`)) n++
  return `${template.name} ${n}`
}
