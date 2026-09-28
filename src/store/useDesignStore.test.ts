import { beforeEach, describe, expect, it } from 'vitest'
import { findClashes } from '../lib/geometry'
import { toProjectData } from '../lib/project'
import { DEFAULT_THICKNESS } from '../lib/defaults'
import { wallOf } from '../lib/room'
import { useDesignStore } from './useDesignStore'

const store = () => useDesignStore.getState()
const emptyProject = (body = DEFAULT_THICKNESS.body) =>
  toProjectData({ pieces: [], boxes: [], thickness: { ...DEFAULT_THICKNESS, body } })

describe('copy and paste', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('pastes a copy of the selected parts, clear of everything, as one undo step', () => {
    store().addPiece('shelf')
    const original = store().pieces[0]
    store().copySelection()
    store().paste()

    expect(store().pieces).toHaveLength(2)
    const copy = store().pieces[1]
    expect(copy.id).not.toBe(original.id)
    expect(copy.x).toBeGreaterThan(original.x + original.width)
    expect(copy.y).toBe(original.y)
    expect(store().selectedIds).toEqual([copy.id])

    store().undo()
    expect(store().pieces).toHaveLength(1)
  })

  it('copies a whole box when one of its panels is selected, colours included', () => {
    store().addBox()
    const panel = store().pieces.find((piece) => piece.id.endsWith(':left'))!
    store().setPieceColors([panel.id], '#123456')
    store().select(panel.id)
    store().copySelection()
    store().paste()

    expect(store().boxes).toHaveLength(2)
    const pastedBox = store().boxes[1]
    const pastedPanels = store().pieces.filter((piece) => piece.boxId === pastedBox.id)
    expect(pastedPanels).toHaveLength(5)
    expect(pastedPanels.every((piece) => piece.color === '#123456')).toBe(true)
    expect(findClashes(store().pieces, store().thickness).size).toBe(0)
  })

  it('pastes into another project, taking that project’s board thickness', () => {
    store().addPiece('vertical')
    store().addBox()
    store().selectMany(store().pieces.map((piece) => piece.id))
    store().copySelection()

    store().loadProject(emptyProject(16))
    expect(store().canPaste).toBe(true)
    store().paste()

    expect(store().boxes).toHaveLength(1)
    expect(store().pieces).toHaveLength(6)
    const side = store().pieces.find((piece) => piece.kind === 'vertical' && !piece.boxId)!
    expect(side.width).toBe(16)
    expect(store().selectedIds).toHaveLength(6)
  })

  it('does nothing with nothing selected', () => {
    store().addPiece('shelf')
    store().select(null)
    const before = store().canPaste
    store().copySelection()
    expect(store().canPaste).toBe(before)
  })
})

describe('walls', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('puts new parts and boxes on the wall being edited', () => {
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    store().addBox()
    expect(store().pieces.every((piece) => piece.wall === 'left')).toBe(true)
    expect(store().boxes[0].wall).toBe('left')
  })

  it('places a new part clear of the parts on its own wall only', () => {
    store().addPiece('shelf')
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    const [back, side] = store().pieces
    expect(side.x).toBe(back.x)
  })

  it('deletes the parts on a wall that is switched off, and undo brings them back', () => {
    store().setRoom({ right: true })
    store().setActiveWall('right')
    store().addBox()
    store().addPiece('rod')
    store().setActiveWall('back')
    store().addPiece('shelf')

    store().setRoom({ right: false })
    expect(store().pieces.map(wallOf)).toEqual(['back'])
    expect(store().boxes).toHaveLength(0)

    store().undo()
    expect(store().room.right).toBe(true)
    expect(store().pieces).toHaveLength(7)
    expect(store().boxes).toHaveLength(1)
  })

  it('goes back to the back wall when the wall being edited is switched off', () => {
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().setRoom({ left: false })
    expect(store().activeWall).toBe('back')
  })

  it("doesn't record a room change that changes nothing", () => {
    store().setRoom({ left: false, width: store().room.width })
    expect(store().past).toHaveLength(0)
  })

  it('shows the wall of a part when it is selected', () => {
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    const id = store().selectedId!
    store().setActiveWall('back')
    expect(store().selectedId).toBeNull()
    store().select(id)
    expect(store().activeWall).toBe('left')
  })

  it('moves a whole box to another wall', () => {
    store().setRoom({ right: true })
    store().addBox()
    const panel = store().selectedId!
    store().updatePiece(panel, { wall: 'right' })
    expect(store().pieces.every((piece) => piece.wall === 'right')).toBe(true)
    expect(store().activeWall).toBe('right')
  })

  it('pastes onto the wall being edited', () => {
    store().addPiece('shelf')
    store().copySelection()
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().paste()
    expect(store().pieces.map(wallOf)).toEqual(['back', 'left'])
  })
})

describe('moving several parts', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('moves loose parts and whole boxes together, as one undo step', () => {
    store().addPiece('shelf')
    store().addBox()
    const shelf = store().pieces[0]
    const box = store().boxes[0]
    const panel = store().pieces.find((piece) => piece.id.endsWith(':left'))!
    store().updatePiece(shelf.id, { y: 500 })
    const shelfY = store().pieces[0].y

    store().movePieces([shelf.id, panel.id], 100, 50)
    expect(store().pieces[0]).toMatchObject({ x: shelf.x + 100, y: shelfY + 50 })
    expect(store().boxes[0]).toMatchObject({ x: box.x + 100, y: box.y + 50 })

    store().undo()
    expect(store().pieces[0]).toMatchObject({ x: shelf.x, y: shelfY })
    expect(store().boxes[0]).toMatchObject({ x: box.x, y: box.y })
  })

  it('stops the lowest part at the floor, keeping the others in place around it', () => {
    store().addPiece('shelf')
    store().addPiece('shelf')
    const [low, high] = store().pieces.map((piece) => piece.id)
    store().updatePiece(low, { y: 100 })
    store().updatePiece(high, { y: 400 })
    store().movePieces([low, high], 0, -300)
    expect(store().pieces.map((piece) => piece.y)).toEqual([0, 300])
  })

  it('leaves parts on other walls, and records nothing for no movement', () => {
    store().addPiece('shelf')
    const back = store().selectedId!
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    const left = store().selectedId!
    const before = store().pieces.find((piece) => piece.id === back)!.x
    store().movePieces([back, left], 100, 0)
    expect(store().pieces.find((piece) => piece.id === back)!.x).toBe(before)

    const steps = store().past.length
    store().movePieces([left], 0, 0)
    expect(store().past.length).toBe(steps)
  })
})
