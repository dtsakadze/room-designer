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

describe('doors', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('changes a door’s options, each as an undo step', () => {
    store().addPiece('door')
    const id = store().selectedId!
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
    const id = store().selectedId!
    const steps = store().past.length
    store().beginBatch()
    for (const x of [10, 20, 30]) store().updatePiece(id, { x })
    store().endBatch()
    expect(store().past.length).toBe(steps + 1)
    store().undo()
    expect(byId(id).x).not.toBe(30)
  })

  it('keeps at most 200 steps', () => {
    store().addPiece('shelf')
    const id = store().selectedId!
    for (let x = 1; x <= 250; x++) store().updatePiece(id, { x })
    expect(store().past).toHaveLength(200)
  })

  it('keeps a selection that still exists, and drops one that doesn’t', () => {
    store().addPiece('shelf')
    const first = store().selectedId!
    store().addPiece('divider')
    store().selectMany([first, store().selectedId!])
    store().undo()
    expect(store().selectedIds).toEqual([first])
    expect(store().selectedId).toBe(first)
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
    const first = byId(store().selectedId!)
    store().addPiece('vertical')
    const second = byId(store().selectedId!)
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

  it('starts parts as deep as the unit depth', () => {
    store().setUnitDepth(350)
    store().addPiece('vertical')
    expect(store().pieces[0].depth).toBe(350)
  })

  it('adds a box with its five panels, selecting one of them', () => {
    store().addBox()
    expect(store().boxes).toHaveLength(1)
    expect(store().pieces).toHaveLength(5)
    expect(store().selectedId).toBe(`${store().boxes[0].id}:left`)
  })
})

describe('changing parts', () => {
  beforeEach(() => store().loadProject(emptyProject()))

  it('changes a part, normalised, as one undo step', () => {
    store().addPiece('shelf')
    const id = store().selectedId!
    store().updatePiece(id, { width: 640.4, height: 99 })
    // A shelf's height is its board thickness.
    expect(byId(id)).toMatchObject({ width: 640, height: 18 })
  })

  it('records nothing for a change that changes nothing', () => {
    store().addPiece('shelf')
    const id = store().selectedId!
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
    const shelf = byId(store().selectedId!)
    store().duplicatePiece(shelf.id)
    const copy = byId(store().selectedId!)
    expect(copy.id).not.toBe(shelf.id)
    expect(copy).toMatchObject({ x: shelf.x + shelf.width + 100, y: shelf.y, width: shelf.width })
    store().addBox()
    store().duplicatePiece(store().selectedId!)
    expect(store().boxes).toHaveLength(2)
    expect(store().pieces).toHaveLength(2 + 10)
  })

  it('deletes a part, or the whole box when one of its panels is deleted', () => {
    store().addPiece('shelf')
    const shelf = store().selectedId!
    store().addBox()
    store().removePiece(store().selectedId!)
    expect(store().boxes).toHaveLength(0)
    expect(ids()).toEqual([shelf])
    store().removePiece(shelf)
    expect(store().pieces).toHaveLength(0)
    expect(store().selectedId).toBeNull()
  })

  it('deletes several parts at once, whole boxes included, as one undo step', () => {
    store().addPiece('shelf')
    const shelf = store().selectedId!
    store().addBox()
    store().addPiece('divider')
    const divider = store().selectedId!
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
    const id = store().selectedId!
    store().select(null)
    expect(store().selectedIds).toEqual([])
    store().select(id)
    expect(store().selectedIds).toEqual([id])
  })

  it('adds a part to the selection with ⌘-click, or takes it out', () => {
    store().addPiece('shelf')
    const a = store().selectedId!
    store().addPiece('divider')
    const b = store().selectedId!
    store().select(a)
    store().toggleSelect(b)
    expect(store().selectedIds).toEqual([a, b])
    expect(store().selectedId).toBe(b)
    store().toggleSelect(b)
    expect(store().selectedIds).toEqual([a])
    expect(store().selectedId).toBe(a)
  })

  it('selects many, or adds them to the selection without repeats', () => {
    store().addPiece('shelf')
    const a = store().selectedId!
    store().addPiece('divider')
    const b = store().selectedId!
    store().selectMany([a])
    store().selectMany([a, b], true)
    expect(store().selectedIds).toEqual([a, b])
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
    store().setPieceColors([store().selectedId!], '#445566')
    expect(store().pieces.every((piece) => piece.color === '#445566')).toBe(true)
    store().setPieceColors([store().selectedId!], null)
    expect(store().pieces.some((piece) => 'color' in piece)).toBe(false)
  })

  it('records nothing when the colour is already set', () => {
    store().addPiece('shelf')
    store().setPieceColors([store().selectedId!], '#445566')
    const steps = store().past.length
    store().setPieceColors([store().selectedId!], '#445566')
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
    expect(store()).toMatchObject({ activeWall: 'back', selectedId: null, selectedIds: [] })
  })
})
