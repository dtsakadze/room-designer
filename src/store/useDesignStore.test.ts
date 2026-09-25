import { beforeEach, describe, expect, it } from 'vitest'
import { findClashes } from '../lib/geometry'
import { toProjectData } from '../lib/project'
import { DEFAULT_THICKNESS } from '../lib/defaults'
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
