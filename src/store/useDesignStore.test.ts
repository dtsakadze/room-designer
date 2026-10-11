import { beforeEach, describe, expect, it } from 'vitest'
import { findClashes, fitBetweenSides } from '../lib/geometry'
import { LOOKS, STANDARD_LOOK } from '../lib/looks'
import { toProjectData } from '../lib/project'
import { DEFAULT_THICKNESS, MAX_THICKNESS, accessoryDefaults, slidingDoorDefaults } from '../lib/defaults'
import { wallOf } from '../lib/room'
import { selectedIdOf, useDesignStore } from './useDesignStore'

const store = () => useDesignStore.getState()
const selected = () => selectedIdOf(store())
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

  it('duplicates a box with its panels’ colours and banding, not the new-part colour', () => {
    store().setDefaultColor('#abcdef')
    store().addBox()
    const box = store().boxes[0]
    store().setPieceColors([`${box.id}:left`], '#123456')
    store().updatePiece(`${box.id}:left`, { bands: [] })
    store().setPieceColors([`${box.id}:top`], null)
    const finish = (id: string) => {
      const { color, bands, grain } = byId(id)
      return { color, bands, grain }
    }
    store().duplicatePiece(`${box.id}:left`)
    const copy = store().boxes[1]
    for (const role of ['left', 'right', 'top', 'bottom', 'back']) {
      expect(finish(`${copy.id}:${role}`)).toEqual(finish(`${box.id}:${role}`))
    }
    store().setDefaultColor(null)
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
    const id = selected()!
    store().setActiveWall('back')
    expect(selected()).toBeNull()
    store().select(id)
    expect(store().activeWall).toBe('left')
  })

  it('moves a whole box to another wall', () => {
    store().setRoom({ right: true })
    store().addBox()
    const panel = selected()!
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
    // A rail, since an adjustable shelf would snap to the holes.
    store().addPiece('rail')
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
    store().addPiece('rail')
    store().addPiece('rail')
    const [low, high] = store().pieces.map((piece) => piece.id)
    store().updatePiece(low, { y: 100 })
    store().updatePiece(high, { y: 400 })
    store().movePieces([low, high], 0, -300)
    expect(store().pieces.map((piece) => piece.y)).toEqual([0, 300])
  })

  it('leaves parts on other walls, and records nothing for no movement', () => {
    store().addPiece('shelf')
    const back = selected()!
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    const left = selected()!
    const before = store().pieces.find((piece) => piece.id === back)!.x
    store().movePieces([back, left], 100, 0)
    expect(store().pieces.find((piece) => piece.id === back)!.x).toBe(before)

    const steps = store().past.length
    store().movePieces([left], 0, 0)
    expect(store().past.length).toBe(steps)
  })
})

describe('doors', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('changes a door’s options, each as an undo step', () => {
    store().addPiece('door')
    const id = selected()!
    const door = () => store().pieces.find((piece) => piece.id === id)!
    store().updatePiece(id, { hinge: 'right' })
    expect(door().hinge).toBe('right')
    store().updatePiece(id, { inset: true })
    expect(door().inset).toBe(true)
    store().updatePiece(id, { double: true })
    expect(door().double).toBe(true)
    // A double door is hinged on both sides.
    expect(door()).not.toHaveProperty('hinge')

    store().undo()
    expect(door()).toMatchObject({ hinge: 'right', inset: true })
    expect(door()).not.toHaveProperty('double')
  })
})

describe('boards', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('gives doors the fronts board, and follows it when it changes', () => {
    store().addPiece('door')
    store().setThickness({ front: 22 })
    expect(store().pieces[0].depth).toBe(22)
    store().undo()
    expect(store().pieces[0].depth).toBe(DEFAULT_THICKNESS.front)
  })

  it('names a board, trimmed, as an undo step, and forgets an empty name', () => {
    store().setBoardName('front', '  19 mm oak MDF ')
    expect(store().boardNames).toEqual({ front: '19 mm oak MDF' })
    const steps = store().past.length
    store().setBoardName('front', '19 mm oak MDF')
    expect(store().past.length).toBe(steps)
    store().setBoardName('front', '')
    expect(store().boardNames).toEqual({})
    store().undo()
    expect(store().boardNames).toEqual({ front: '19 mm oak MDF' })
    expect(toProjectData(store()).boardNames).toEqual({ front: '19 mm oak MDF' })
  })
  it('marks boards with a grain, as an undo step, and saves them', () => {
    store().setBoardGrain('front', true)
    store().setBoardGrain('body', true)
    expect(store().grainedBoards).toEqual(['body', 'front'])
    const steps = store().past.length
    store().setBoardGrain('body', true)
    expect(store().past.length).toBe(steps)
    expect(toProjectData(store()).grainedBoards).toEqual(['body', 'front'])
    store().setBoardGrain('body', false)
    expect(store().grainedBoards).toEqual(['front'])
    store().undo()
    store().undo()
    store().undo()
    expect(store().grainedBoards).toEqual([])
    expect(toProjectData(store())).not.toHaveProperty('grainedBoards')
  })
})

describe('board colours', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('colours a board and its edge banding, each as an undo step, and saves them', () => {
    store().setBoardColor('front', '#b08a5a')
    store().setEdgeColor('body', '#222222')
    expect(store().boardColors).toEqual({ front: '#b08a5a' })
    expect(store().edgeColors).toEqual({ body: '#222222' })
    const steps = store().past.length
    store().setBoardColor('front', '#b08a5a')
    expect(store().past.length).toBe(steps)
    expect(toProjectData(store())).toMatchObject({ boardColors: { front: '#b08a5a' }, edgeColors: { body: '#222222' } })
    store().setBoardColor('front', null)
    expect(store().boardColors).toEqual({})
    store().undo()
    store().undo()
    expect(store().boardColors).toEqual({ front: '#b08a5a' })
    expect(store().edgeColors).toEqual({})
  })
})

describe('fit between sides', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  // What the inspector's Fit button does.
  const fit = (id: string) => {
    const gap = fitBetweenSides(byId(id), store().pieces)
    if (gap) store().updatePiece(id, gap)
  }

  it('fills the gap between the sides as one undo step, and does nothing without sides', () => {
    store().addPiece('vertical')
    const left = selected()!
    store().updatePiece(left, { x: -1200 })
    store().addPiece('vertical')
    store().updatePiece(selected()!, { x: 29 })
    store().addPiece('plinth')
    const plinth = selected()!
    store().updatePiece(plinth, { x: -1000, y: 20 })
    const steps = store().past.length
    fit(plinth)
    expect(byId(plinth)).toMatchObject({ x: -1182, width: 1211 })
    expect(store().past.length).toBe(steps + 1)
    // Already fitting: nothing to undo.
    fit(plinth)
    expect(store().past.length).toBe(steps + 1)
    store().undo()
    expect(byId(plinth).x).toBe(-1000)

    store().removePieces([left])
    const before = store().past.length
    fit(plinth)
    expect(store().past.length).toBe(before)
  })
})

describe('adjustable shelves', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  /** A box's left side, and a shelf added and moved in between its sides. */
  const shelfInBox = () => {
    store().addBox()
    const box = store().boxes[0]
    store().addPiece('shelf')
    const shelf = selected()!
    store().updatePiece(shelf, { x: box.x + 18, width: box.width - 36, y: 500 })
    return { box, shelf }
  }

  it('sit on the nearest hole of the sides', () => {
    const { box, shelf } = shelfInBox()
    // The sides start at the box's bottom; holes every 32 mm above it.
    expect((byId(shelf).y - box.y) % 32).toBe(0)
    expect(byId(shelf).y).toBe(512)
    // Moved with the rest of a selection, it lands on a hole too.
    store().movePieces([shelf], 0, 40)
    expect(byId(shelf).y).toBe(544)
  })

  it('land on this project’s holes when pasted from one with other spacing', () => {
    const { box, shelf } = shelfInBox()
    store().selectMany([...store().pieces.filter((piece) => piece.boxId === box.id).map((piece) => piece.id), shelf])
    store().copySelection()
    store().loadProject(emptyProject())
    store().setHolePitch(25)
    store().paste()
    const pastedBox = store().boxes[0]
    const pasted = store().pieces.find((piece) => piece.kind === 'shelf' && !piece.boxId)!
    expect((pasted.y - pastedBox.y) % 25).toBe(0)
  })

  it('records nothing for a move too small to reach another hole', () => {
    const { shelf } = shelfInBox()
    const steps = store().past.length
    store().updatePiece(shelf, { y: byId(shelf).y + 10 })
    store().movePieces([shelf], 0, 10)
    expect(store().past.length).toBe(steps)
  })

  it('leaves fixed shelves where they’re put', () => {
    const { shelf } = shelfInBox()
    store().updatePiece(shelf, { fixed: true })
    store().updatePiece(shelf, { y: 503 })
    expect(byId(shelf).y).toBe(503)
    // Making it adjustable again puts it on a hole.
    store().updatePiece(shelf, { fixed: false })
    expect(byId(shelf).y).toBe(512)
  })

  it('moves every adjustable shelf onto the new holes when the spacing changes, as one undo step', () => {
    const { shelf } = shelfInBox()
    store().setHolePitch(37)
    expect(store().holePitch).toBe(37)
    expect(byId(shelf).y).toBe(518)
    expect(toProjectData(store()).holePitch).toBe(37)
    store().undo()
    expect(store().holePitch).toBe(32)
    expect(byId(shelf).y).toBe(512)
    const steps = store().past.length
    store().setHolePitch(32)
    expect(store().past.length).toBe(steps)
  })
})

describe('edge banding and grain', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('changes a part’s banding and grain, and goes back to the usual ones', () => {
    store().addPiece('shelf')
    const id = store().pieces[0].id
    store().updatePiece(id, { bands: ['front', 'back'], grain: 'depth' })
    expect(store().pieces[0]).toMatchObject({ bands: ['front', 'back'], grain: 'depth' })
    store().updatePiece(id, { bands: ['front'], grain: 'width' })
    expect(store().pieces[0]).not.toHaveProperty('bands')
    expect(store().pieces[0]).not.toHaveProperty('grain')
    store().undo()
    expect(store().pieces[0].bands).toEqual(['front', 'back'])
  })

  it('gives a box’s panel its own banding, kept when the box changes and when it’s copied', () => {
    store().addBox()
    const box = store().boxes[0]
    const top = `${box.id}:top`
    store().updatePiece(top, { bands: ['front', 'left', 'right'] })
    expect(byId(top).bands).toEqual(['front', 'left', 'right'])
    // Only that panel, and the box stays where it was.
    expect(store().pieces.filter((piece) => piece.bands)).toHaveLength(1)
    expect(store().boxes[0]).toEqual(box)

    store().updateBox(box.id, { width: 900 })
    expect(byId(top).bands).toEqual(['front', 'left', 'right'])

    store().select(top)
    store().copySelection()
    store().paste()
    const pasted = store().boxes[1]
    expect(byId(`${pasted.id}:top`).bands).toEqual(['front', 'left', 'right'])
    expect(byId(`${pasted.id}:left`)).not.toHaveProperty('bands')
  })
})

const byId = (id: string) => store().pieces.find((piece) => piece.id === id)!
const ids = () => store().pieces.map((piece) => piece.id)

describe('undo and redo', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('undoes and redoes a change', () => {
    store().addPiece('shelf')
    store().undo()
    expect(store().pieces).toHaveLength(0)
    store().redo()
    expect(store().pieces).toHaveLength(1)
  })

  it('forgets what could be redone once something new is changed', () => {
    store().addPiece('shelf')
    store().undo()
    store().addPiece('divider')
    store().redo()
    expect(store().pieces.map((piece) => piece.kind)).toEqual(['divider'])
  })

  it('does nothing with nothing to undo or redo', () => {
    store().undo()
    store().redo()
    expect(store().pieces).toHaveLength(0)
  })

  it('undoes a batch of changes (a drag, typing) as one step', () => {
    store().addPiece('shelf')
    const id = selected()!
    const steps = store().past.length
    store().beginBatch()
    for (const x of [10, 20, 30]) store().updatePiece(id, { x })
    store().endBatch()
    expect(store().past.length).toBe(steps + 1)
    store().undo()
    expect(byId(id).x).not.toBe(30)
  })

  it('makes the rest of a drag its own step after an undo in the middle of it', () => {
    store().addPiece('shelf')
    const id = selected()!
    store().updatePiece(id, { x: 100 })
    store().beginBatch()
    store().updatePiece(id, { x: 200 })
    store().undo()
    expect(byId(id).x).toBe(100)
    store().updatePiece(id, { x: 300 })
    store().endBatch()
    expect(store().future).toHaveLength(0)
    store().undo()
    expect(byId(id).x).toBe(100)
    store().undo()
    expect(byId(id).x).not.toBe(100)
  })

  it('keeps at most 200 steps', () => {
    store().addPiece('shelf')
    const id = selected()!
    for (let x = 1; x <= 250; x++) store().updatePiece(id, { x })
    expect(store().past).toHaveLength(200)
  })

  it('keeps a selection that still exists, and drops one that doesn’t', () => {
    store().addPiece('shelf')
    const first = selected()!
    store().addPiece('divider')
    store().selectMany([first, selected()!])
    store().undo()
    expect(store().selectedIds).toEqual([first])
    expect(selected()).toBe(first)
  })

  it('takes the view along when undo moves the selected part to another wall', () => {
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    const id = selected()!
    store().updatePiece(id, { wall: undefined })
    expect(store().activeWall).toBe('back')
    store().undo()
    expect(byId(id).wall).toBe('left')
    expect(store().activeWall).toBe('left')
    expect(selected()).toBe(id)
    store().redo()
    expect(store().activeWall).toBe('back')
  })

  it('starts a fresh history when a project is opened', () => {
    store().addPiece('shelf')
    store().loadProject(emptyProject())
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
  })
})

describe('adding parts', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('selects a new part and places it right of everything, on the floor', () => {
    store().addPiece('vertical')
    const first = byId(selected()!)
    store().addPiece('vertical')
    const second = byId(selected()!)
    expect(store().selectedIds).toEqual([second.id])
    expect(second.x).toBe(first.x + first.width + 100)
    expect(second.y).toBe(0)
  })

  it('gives a new part the colour for new parts, if one is set', () => {
    store().setDefaultColor('#112233')
    store().addPiece('shelf')
    store().addBox()
    expect(store().pieces.every((piece) => piece.color === '#112233')).toBe(true)
  })

  it('leaves the new-part colour and unit depth out of undo', () => {
    store().addPiece('shelf')
    store().setDefaultColor('#112233')
    store().setUnitDepth(350)
    store().undo()
    expect(store().pieces).toHaveLength(0)
    expect(store()).toMatchObject({ defaultColor: '#112233', unitDepth: 350 })
    store().setDefaultColor(null)
  })

  it('starts parts as deep as the unit depth', () => {
    store().setUnitDepth(350)
    store().addPiece('vertical')
    expect(store().pieces[0].depth).toBe(350)
  })

  it('adds a box with its five panels, selecting one of them', () => {
    store().addBox()
    expect(store().boxes).toHaveLength(1)
    expect(store().pieces).toHaveLength(5)
    expect(selected()).toBe(`${store().boxes[0].id}:left`)
  })
})

describe('changing parts', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('changes a part, normalised, as one undo step', () => {
    store().addPiece('shelf')
    const id = selected()!
    store().updatePiece(id, { width: 640.4, height: 99 })
    // A shelf's height is its board thickness.
    expect(byId(id)).toMatchObject({ width: 640, height: 18 })
  })

  it('records nothing for a change that changes nothing', () => {
    store().addPiece('shelf')
    const id = selected()!
    const steps = store().past.length
    store().updatePiece(id, { x: byId(id).x })
    store().updatePiece(id, { height: 50 })
    expect(store().past.length).toBe(steps)
  })

  it('moves the whole box when one of its panels is moved, and nothing else', () => {
    store().addBox()
    const box = store().boxes[0]
    const panel = byId(`${box.id}:top`)
    store().updatePiece(panel.id, { x: panel.x + 50, y: panel.y + 20, width: 5 })
    expect(store().boxes[0]).toMatchObject({ x: box.x + 50, y: box.y + 20, width: box.width })
    expect(byId(`${box.id}:left`).x).toBe(box.x + 50)
  })

  it('resizes a box and rebuilds its panels', () => {
    store().addBox()
    const box = store().boxes[0]
    store().updateBox(box.id, { width: 800, joint: 'on' })
    expect(byId(`${box.id}:top`)).toMatchObject({ x: box.x, width: 800 })
  })

  it('separates a box into loose panels that keep their places', () => {
    store().addBox()
    const box = store().boxes[0]
    const before = store().pieces.map(({ boxId: _box, ...rest }) => rest)
    store().separateBox(box.id)
    expect(store().boxes).toHaveLength(0)
    expect(store().pieces).toEqual(before)
    store().undo()
    expect(store().boxes).toHaveLength(1)
  })

  it('duplicates a part next to it, or a whole box clear of everything', () => {
    store().addPiece('shelf')
    const shelf = byId(selected()!)
    store().duplicatePiece(shelf.id)
    const copy = byId(selected()!)
    expect(copy.id).not.toBe(shelf.id)
    expect(copy).toMatchObject({ x: shelf.x + shelf.width + 100, y: shelf.y, width: shelf.width })
    store().addBox()
    store().duplicatePiece(selected()!)
    expect(store().boxes).toHaveLength(2)
    expect(store().pieces).toHaveLength(2 + 10)
  })

  it('deletes a part, or the whole box when one of its panels is deleted', () => {
    store().addPiece('shelf')
    const shelf = selected()!
    store().addBox()
    store().removePieces([selected()!])
    expect(store().boxes).toHaveLength(0)
    expect(ids()).toEqual([shelf])
    store().removePieces([shelf])
    expect(store().pieces).toHaveLength(0)
    expect(selected()).toBeNull()
  })

  it('deletes several parts at once, whole boxes included, as one undo step', () => {
    store().addPiece('shelf')
    const shelf = selected()!
    store().addBox()
    store().addPiece('divider')
    const divider = selected()!
    store().removePieces([shelf, `${store().boxes[0].id}:back`])
    expect(ids()).toEqual([divider])
    store().undo()
    expect(store().pieces).toHaveLength(7)
  })

  it('clears the design, as an undo step', () => {
    store().addBox()
    store().clear()
    expect(store().pieces).toHaveLength(0)
    store().undo()
    expect(store().pieces).toHaveLength(5)
  })
})

describe('selection', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('selects one part, or none', () => {
    store().addPiece('shelf')
    const id = selected()!
    store().select(null)
    expect(store().selectedIds).toEqual([])
    store().select(id)
    expect(store().selectedIds).toEqual([id])
  })

  it('adds a part to the selection with ⌘-click, or takes it out', () => {
    store().addPiece('shelf')
    const a = selected()!
    store().addPiece('divider')
    const b = selected()!
    store().select(a)
    store().toggleSelect(b)
    expect(store().selectedIds).toEqual([a, b])
    expect(selected()).toBe(b)
    store().toggleSelect(b)
    expect(store().selectedIds).toEqual([a])
    expect(selected()).toBe(a)
  })

  it('selects many, or adds them to the selection without repeats', () => {
    store().addPiece('shelf')
    const a = selected()!
    store().addPiece('divider')
    const b = selected()!
    store().selectMany([a])
    store().selectMany([a, b], true)
    expect(store().selectedIds).toEqual([a, b])
  })

  it('keeps to one wall unless the whole room is shown', () => {
    store().setRoom({ left: true })
    store().addPiece('shelf')
    const back = selected()!
    store().setActiveWall('left')
    store().addPiece('divider')
    const left = selected()!
    store().select(back)
    store().toggleSelect(left)
    expect(store().selectedIds).toEqual([left])
    expect(store().activeWall).toBe('left')
    store().selectMany([back], true)
    expect(store().selectedIds).toEqual([back])

    store().setWholeRoomShown(true)
    store().selectMany([back, left])
    expect(store().selectedIds).toEqual([back, left])
    store().setWholeRoomShown(false)
    expect(store().selectedIds).toEqual([left])
    expect(selected()).toBe(left)
  })

  it('isn’t part of the undo history', () => {
    store().addPiece('shelf')
    const steps = store().past.length
    store().select(null)
    expect(store().past.length).toBe(steps)
  })
})

describe('colours', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('colours a box’s panels together, and goes back to the standard look', () => {
    store().addBox()
    store().setPieceColors([selected()!], '#445566')
    expect(store().pieces.every((piece) => piece.color === '#445566')).toBe(true)
    store().setPieceColors([selected()!], null)
    expect(store().pieces.some((piece) => 'color' in piece)).toBe(false)
  })

  it('records nothing when the colour is already set', () => {
    store().addPiece('shelf')
    store().setPieceColors([selected()!], '#445566')
    const steps = store().past.length
    store().setPieceColors([selected()!], '#445566')
    expect(store().past.length).toBe(steps)
  })

  it('changes the colour for new parts without an undo step', () => {
    const steps = store().past.length
    store().setDefaultColor('#998877')
    expect(store().defaultColor).toBe('#998877')
    expect(store().past.length).toBe(steps)
  })
})

describe('project settings', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('resizes every board and box panel when a thickness changes', () => {
    store().addBox()
    store().addPiece('shelf')
    store().setThickness({ body: 25, back: 6 })
    const box = store().boxes[0]
    expect(byId(`${box.id}:left`).width).toBe(25)
    expect(byId(`${box.id}:back`).depth).toBe(6)
    expect(store().pieces.at(-1)!.height).toBe(25)
  })

  it('keeps thicknesses whole and at least 1 mm, and records nothing for no change', () => {
    store().setThickness({ body: 0 })
    expect(store().thickness.body).toBe(1)
    const steps = store().past.length
    store().setThickness({ body: 1.2 })
    expect(store().past.length).toBe(steps)
    store().setThickness({ body: Infinity })
    expect(store().thickness.body).toBe(MAX_THICKNESS)
  })

  it('keeps the unit depth within limits, without an undo step', () => {
    store().setUnitDepth(5)
    expect(store().unitDepth).toBe(100)
    store().setUnitDepth(9999)
    expect(store().unitDepth).toBe(1500)
    expect(store().past).toHaveLength(0)
  })

  it('keeps the room within limits', () => {
    store().setRoom({ width: 10, depth: 999999 })
    expect(store().room).toMatchObject({ width: 500, depth: 20000 })
  })

  it('only switches to a wall that’s in use, and lets go of the selection on the old one', () => {
    store().addPiece('shelf')
    store().setActiveWall('left')
    expect(store().activeWall).toBe('back')
    store().setRoom({ left: true })
    store().setActiveWall('left')
    expect(store().activeWall).toBe('left')
    expect(store().selectedIds).toEqual([])
  })
})

describe('opening another design', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('replaces the design from a file as one undo step, with its settings', () => {
    store().addPiece('shelf')
    const file = toProjectData({
      pieces: [],
      boxes: [],
      thickness: { ...DEFAULT_THICKNESS, body: 22 },
      unitDepth: 400,
      defaultColor: '#abcdef',
      boardNames: { body: 'Oak' },
    })
    store().replaceDesign(file)
    expect(store()).toMatchObject({
      pieces: [],
      unitDepth: 400,
      defaultColor: '#abcdef',
      boardNames: { body: 'Oak' },
    })
    expect(store().thickness.body).toBe(22)
    store().undo()
    expect(store().pieces).toHaveLength(1)
    expect(store().thickness.body).toBe(18)
  })

  it('opens a project on the back wall with nothing selected', () => {
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().addPiece('shelf')
    store().loadProject(emptyProject())
    expect(store()).toMatchObject({ activeWall: 'back', selectedIds: [] })
  })
})

describe('sliding doors', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('are added as a door with two panels, centred, and can go back to hinged', () => {
    store().addPiece('door', slidingDoorDefaults(DEFAULT_THICKNESS))
    const door = store().pieces[0]
    expect(door).toMatchObject({ kind: 'door', sliding: 2 })
    expect(door.x).toBe(-door.width / 2)
    store().updatePiece(door.id, { sliding: undefined })
    expect(store().pieces[0]).not.toHaveProperty('sliding')
  })
})

describe('ceiling and trim', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('sets and clears the ceiling height, as undoable steps', () => {
    store().setRoom({ height: 2400 })
    expect(store().room.height).toBe(2400)
    store().setRoom({ height: 2400 })
    expect(store().past).toHaveLength(1)
    store().setRoom({ height: undefined })
    expect(store().room).not.toHaveProperty('height')
  })

  it('puts a new cornice on top of the unit, as wide as it', () => {
    store().addBox()
    const box = store().boxes[0]
    store().addPiece('cornice')
    const cornice = store().pieces.find((piece) => piece.kind === 'cornice')!
    expect(cornice).toMatchObject({ x: box.x, y: box.y + box.height, width: box.width })
  })
})

describe('front-to-back position', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('is set with updatePiece, and reset to automatic with undefined', () => {
    store().addPiece('shelf')
    const id = store().pieces[0].id
    store().updatePiece(id, { z: 120 })
    expect(store().pieces[0].z).toBe(120)
    store().updatePiece(id, { z: undefined })
    expect(store().pieces[0]).not.toHaveProperty('z')
  })

  it('moves a whole box with its z', () => {
    store().addBox()
    const id = store().boxes[0].id
    store().updateBox(id, { z: 60 })
    expect(store().pieces.filter((p) => p.boxId === id).every((p) => p.z !== undefined)).toBe(true)
    store().updateBox(id, { z: undefined })
    expect(store().pieces.some((p) => 'z' in p)).toBe(false)
  })
})

describe('board materials', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('are set per board, undoable, with chipboard stored as nothing', () => {
    store().setBoardMaterial('body', 'plywood')
    expect(store().boardMaterials).toEqual({ body: 'plywood' })
    store().setBoardMaterial('body', 'plywood')
    expect(store().past).toHaveLength(1)
    store().setBoardMaterial('body', 'chipboard')
    expect(store().boardMaterials).toEqual({})
    store().undo()
    expect(store().boardMaterials).toEqual({ body: 'plywood' })
  })

  it('save with the project', () => {
    store().setBoardMaterial('front', 'solid')
    expect(toProjectData(store()).boardMaterials).toEqual({ front: 'solid' })
  })
})

describe('joint type', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('is plain screws to start, changes as an undoable step, and is saved unless screws', () => {
    expect(store().joints).toBe('screws')
    expect(toProjectData(store())).not.toHaveProperty('joints')
    store().setJoints('cam')
    store().setJoints('cam')
    expect(store().past).toHaveLength(1)
    expect(toProjectData(store()).joints).toBe('cam')
    store().undo()
    expect(store().joints).toBe('screws')
  })
})

describe('boards bought as whole sheets', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('are set per board with a clean sheet, undoable, and saved; null goes back to cut to size', () => {
    store().setBoardSheet('body', { length: 2800.4, width: 2070, kerf: 3 })
    expect(store().boardSheets).toEqual({ body: { length: 2800, width: 2070, kerf: 3 } })
    store().setBoardSheet('body', { length: 2800, width: 2070, kerf: 3 })
    expect(store().past).toHaveLength(1)
    expect(toProjectData(store()).boardSheets).toEqual({ body: { length: 2800, width: 2070, kerf: 3 } })
    store().setBoardSheet('body', null)
    expect(store().boardSheets).toEqual({})
    expect(toProjectData(store())).not.toHaveProperty('boardSheets')
    store().undo()
    expect(store().boardSheets.body?.length).toBe(2800)
  })
})

describe('looks', () => {
  beforeEach(() => store().loadProject(emptyProject()))
  const oakWhite = LOOKS.find((look) => look.id === 'oak-white')!
  const black = LOOKS.find((look) => look.id === 'all-black')!

  it('set every board’s colours and grain as one undo step, and skip a look already applied', () => {
    store().applyLook(oakWhite, false)
    expect(store().boardColors.front).toBe(oakWhite.boardColors.front)
    expect(store().edgeColors.body).toBe(oakWhite.edgeColors.body)
    expect(store().grainedBoards).toEqual(['front'])
    store().applyLook(oakWhite, false)
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(store().boardColors).toEqual({})
    expect(store().grainedBoards).toEqual([])
  })

  it('keep parts coloured by hand, unless told to reset them', () => {
    store().addPiece('shelf')
    const id = store().pieces[0].id
    store().setPieceColors([id], '#ff0000')
    store().applyLook(black, false)
    expect(store().pieces[0].color).toBe('#ff0000')
    store().applyLook(black, true)
    expect(store().pieces[0]).not.toHaveProperty('color')
    expect(store().boardColors.body).toBe(black.boardColors.body)
  })

  it('can go back to the standard look: no colours and no grain, as a project starts', () => {
    store().applyLook(oakWhite, false)
    store().applyLook(STANDARD_LOOK, false)
    expect(store().boardColors).toEqual({})
    expect(store().edgeColors).toEqual({})
    expect(store().grainedBoards).toEqual([])
    store().undo()
    expect(store().boardColors.front).toBe(oakWhite.boardColors.front)
  })
})

describe('accessories', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('are added with the size of their type, and can change type without changing size', () => {
    store().addPiece('accessory', accessoryDefaults('trouser'))
    const [added] = store().pieces
    expect(added).toMatchObject({ kind: 'accessory', accessory: 'trouser', width: 500, height: 100, depth: 450 })
    expect(added.x).toBe(-250)
    store().updatePiece(added.id, { accessory: 'basket' })
    expect(store().pieces[0]).toMatchObject({ accessory: 'basket', width: 500, height: 100 })
  })
})

describe('blocks', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('give the selected parts, whole boxes included, for saving; null with nothing selected', () => {
    expect(store().selectionParts()).toBeNull()
    store().addBox()
    store().addPiece('shelf')
    store().select(store().pieces.find((p) => p.boxId)!.id)
    const parts = store().selectionParts()!
    // A panel selects its whole box: five panels, one box, not the loose shelf.
    expect(parts.boxes).toHaveLength(1)
    expect(parts.pieces).toHaveLength(5)
  })

  it('are inserted to the right of what is there, with new ids, selected, as one undo step', () => {
    store().addPiece('shelf')
    store().addPiece('divider')
    store().selectMany(store().pieces.map((p) => p.id))
    const parts = store().selectionParts()!
    store().loadProject(emptyProject())
    store().addBox()
    const before = store().pieces.length
    const rightEdge = Math.max(...store().pieces.map((p) => p.x + p.width))
    store().insertBlock(toProjectData(parts))
    expect(store().pieces).toHaveLength(before + 2)
    const added = store().pieces.slice(before)
    expect(Math.min(...added.map((p) => p.x))).toBeGreaterThan(rightEdge)
    expect(new Set(store().pieces.map((p) => p.id)).size).toBe(store().pieces.length)
    expect(store().selectedIds).toEqual(added.map((p) => p.id))
    store().undo()
    expect(store().pieces).toHaveLength(before)
  })

  it('insert on the wall being edited, and nothing at all for an empty block', () => {
    store().addPiece('shelf')
    const block = toProjectData(store().selectionParts() ?? { pieces: store().pieces, boxes: [], thickness: DEFAULT_THICKNESS })
    store().loadProject(emptyProject())
    store().setRoom({ left: true })
    store().setActiveWall('left')
    store().insertBlock(block)
    expect(store().pieces.every((p) => wallOf(p) === 'left')).toBe(true)
    const count = store().pieces.length
    store().insertBlock(emptyProject())
    expect(store().pieces).toHaveLength(count)
  })
})
