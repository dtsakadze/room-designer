import { describe, expect, it } from 'vitest'
import { clearanceWarnings } from './clearance'
import { DEFAULT_THICKNESS } from './defaults'
import { findClashes } from './geometry'
import { readProject } from './project'
import { isAdjustable, snapToHoles } from './shelfPins'
import { spanWarnings } from './spans'
import { hardwareList } from './cutList'
import { TEMPLATES, projectNameFor } from './templates'

describe('templates', () => {
  it('are the five asked for, with unique ids and names', () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual([
      'Two-door wardrobe',
      'Sliding-door wardrobe',
      'Bookshelf',
      'Closet with drawers',
      'Hall unit',
    ])
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
  })

  for (const template of TEMPLATES) {
    describe(template.name, () => {
      const project = template.build()

      it('opens as it is built, in the current format, with every part', () => {
        const result = readProject(JSON.parse(JSON.stringify(project)))
        if (!result.ok) throw new Error(`${template.name} didn't open`)
        expect(result.project.pieces).toHaveLength(project.pieces.length)
        expect(result.project.pieces).toEqual(project.pieces)
        expect(new Set(project.pieces.map((p) => p.id)).size).toBe(project.pieces.length)
      })

      it('has nothing overlapping, too long or too close behind a door', () => {
        expect(findClashes(project.pieces, project.thickness, project.room).size).toBe(0)
        expect(spanWarnings(project.pieces, project.thickness, {}).size).toBe(0)
        expect(clearanceWarnings(project.pieces, project.thickness).size).toBe(0)
      })

      it('keeps every part inside its box, with adjustable shelves on the holes', () => {
        const [box] = project.boxes
        for (const piece of project.pieces.filter((p) => !p.boxId && p.kind !== 'door')) {
          expect(piece.x).toBeGreaterThanOrEqual(box.x)
          expect(piece.x + piece.width).toBeLessThanOrEqual(box.x + box.width)
          expect(piece.y).toBeGreaterThanOrEqual(box.y)
          expect(piece.y + piece.height).toBeLessThanOrEqual(box.y + box.height)
          if (isAdjustable(piece)) expect(piece.y).toBe(snapToHoles(piece, project.pieces, 32))
        }
      })

      it('lists hardware to buy', () => {
        expect(hardwareList(project.pieces, DEFAULT_THICKNESS).length).toBeGreaterThan(0)
      })
    })
  }

  it('are the same every time they are built', () => {
    for (const template of TEMPLATES) {
      const { savedAt: _a, ...a } = template.build()
      const { savedAt: _b, ...b } = template.build()
      expect(a).toEqual(b)
    }
  })
})

describe('project name for a template', () => {
  it('is its name, then numbered when taken', () => {
    const [template] = TEMPLATES
    expect(projectNameFor(template, [])).toBe('Two-door wardrobe')
    expect(projectNameFor(template, ['Two-door wardrobe'])).toBe('Two-door wardrobe 2')
    expect(projectNameFor(template, ['Two-door wardrobe', 'Two-door wardrobe 2'])).toBe('Two-door wardrobe 3')
  })
})
