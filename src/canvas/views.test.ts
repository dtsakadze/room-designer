import { describe, expect, it } from 'vitest'
import type { Piece } from '../types'
import { DEFAULT_THICKNESS } from '../lib/defaults'
import {
  cornerGhosts,
  drawOrder,
  endWalls,
  isHollow,
  piecesAt,
  projectPieces,
  roomPlan,
  showsEdge,
  sizeLabel,
} from './views'

const piece = (id: string, kind: Piece['kind'], rect: Partial<Piece> = {}): Piece => ({
  id,
  kind,
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
  depth: 18,
  ...rect,
})

describe('clicking through a stack', () => {
  const back = piece('back', 'back')
  const shelf = piece('shelf', 'shelf', { y: 400, height: 18 })
  const door = piece('door', 'door')
  const pieces = [door, back, shelf]

  it('draws the back panel underneath and doors on top in the front view', () => {
    expect(drawOrder(pieces, 'front').map((p) => p.id)).toEqual(['back', 'shelf', 'door'])
  })

  it('goes from the door to the parts inside, then the back panel', () => {
    expect(piecesAt(pieces, 500, 405, 'front').map((p) => p.id)).toEqual(['door', 'shelf', 'back'])
    expect(piecesAt(pieces, 500, 800, 'front').map((p) => p.id)).toEqual(['door', 'back'])
  })

  it('keeps doors underneath from behind, where they are furthest away', () => {
    expect(piecesAt(pieces, 500, 405, 'back').map((p) => p.id)).toEqual(['shelf', 'back', 'door'])
  })
})

describe('projections', () => {
  const thickness = DEFAULT_THICKNESS
  const back = piece('back', 'back', { x: -300, width: 600, height: 1000, depth: 3 })
  const side = piece('side', 'vertical', { x: -300, width: 18, height: 1000, depth: 597 })
  const shelf = piece('shelf', 'shelf', { x: -282, y: 400, width: 564, height: 18, depth: 400 })
  const unit = [back, side, shelf]
  const byId = (list: Piece[]) => Object.fromEntries(list.map((p) => [p.id, p]))

  it('shows the front view as it is', () => {
    expect(projectPieces(unit, 'front', thickness)).toBe(unit)
  })

  it('shows depth across the side views, the wall on the far side', () => {
    const left = byId(projectPieces(unit, 'left', thickness))
    expect(left.shelf).toMatchObject({ x: 3, width: 400, y: 400 })
    const right = byId(projectPieces(unit, 'right', thickness))
    expect(right.shelf).toMatchObject({ x: -403, width: 400 })
  })

  it('shows the plan from the top, the wall along y = 0', () => {
    const top = byId(projectPieces(unit, 'top', thickness))
    expect(top.shelf).toMatchObject({ x: -282, width: 564, y: -403, height: 400 })
  })

  it('mirrors left and right from the back', () => {
    const fromBack = byId(projectPieces(unit, 'back', thickness))
    expect(fromBack.side).toMatchObject({ x: 282, width: 18 })
  })

  it('turns side walls’ units to face out from their wall in the room plan', () => {
    const room = { left: true, right: false, width: 2400, depth: 1800 }
    const onLeft = { ...side, wall: 'left' as const }
    const plan = byId(roomPlan([onLeft], thickness, room))
    // Against the left wall at x = -1200, 597 deep into the room.
    expect(plan.side).toMatchObject({ x: -1200, width: 597 })
  })

  it('outlines the next wall’s parts that come into this wall’s unit', () => {
    const room = { left: true, right: false, width: 2400, depth: 1800 }
    const inCorner = piece('c', 'vertical', { x: 882, width: 18, height: 1000, depth: 600, wall: 'left' })
    const farOut = piece('f', 'vertical', { x: -900, width: 18, height: 1000, depth: 600, wall: 'left' })
    const ghosts = cornerGhosts([inCorner, farOut], thickness, room, 'back', 600)
    expect(ghosts.map((g) => g.id)).toEqual(['c'])
    expect(ghosts[0]).toMatchObject({ x: -1200, width: 600 })
  })

  it('puts the end walls just past each end of the wall', () => {
    const [left, right] = endWalls({ left: true, right: true, width: 2400, depth: 1800 }, 'left')
    expect(left.x + left.width).toBe(-900)
    expect(right.x).toBe(900)
  })
})

describe('labels and looks', () => {
  const len = (mm: number) => `${mm} mm`

  it('labels a part by its size, and a rod by diameter and length', () => {
    expect(sizeLabel(piece('s', 'shelf', { width: 564, height: 18 }), 'front', len)).toBe('564 mm × 18 mm')
    const rod = piece('r', 'rod', { width: 1164, height: 25 })
    expect(sizeLabel(rod, 'front', len)).toBe('⌀25 mm × 1164 mm')
    expect(sizeLabel(rod, 'left', len)).toBe('⌀25 mm')
  })

  it('draws the panels that cover the view see-through', () => {
    expect(isHollow(piece('b', 'back'), 'front')).toBe(true)
    expect(isHollow(piece('d', 'door'), 'front')).toBe(true)
    expect(isHollow(piece('v', 'vertical'), 'left')).toBe(true)
    expect(isHollow(piece('h', 'horizontal'), 'top')).toBe(true)
    expect(isHollow(piece('s', 'shelf'), 'front')).toBe(false)
  })

  it('draws boards seen edge-on darker, and never rods, drawers or 3D', () => {
    expect(showsEdge(piece('s', 'shelf'), 'front')).toBe(true)
    expect(showsEdge(piece('b', 'back'), 'front')).toBe(false)
    expect(showsEdge(piece('b', 'back'), 'left')).toBe(true)
    expect(showsEdge(piece('r', 'rod'), 'front')).toBe(false)
    expect(showsEdge(piece('s', 'shelf'), '3d')).toBe(false)
  })
})
