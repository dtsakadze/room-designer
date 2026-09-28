import { describe, expect, it } from 'vitest'
import { FORMAT_VERSION, readProject, toProjectData } from './project'
import { DEFAULT_ROOM } from './room'

/**
 * Saved samples of every format version. `<name>.json` is a save as that
 * version wrote it; `<name>.expected.json` is what it opened into when it was
 * captured, so upgrades must keep opening it into exactly the same design.
 */
const fixtures = import.meta.glob<unknown>('./fixtures/*.json', { eager: true, import: 'default' })
const fixture = (name: string) => structuredClone(fixtures[`./fixtures/${name}.json`])
const samples = Object.keys(fixtures)
  .map((path) => path.replace('./fixtures/', '').replace('.json', ''))
  .filter((name) => !name.endsWith('.expected'))

type RawSave = { room: unknown; pieces: Record<string, unknown>[]; boxes: { wall?: string }[] }

/** The v3 sample with only its back wall's parts left. */
const backWallOnly = () => {
  const save = fixture('v3-room') as RawSave
  save.pieces = save.pieces.filter((piece) => !piece.wall)
  save.boxes = save.boxes.filter((box) => !box.wall)
  return save
}

const withoutVersion = (project: object) => {
  const { formatVersion: _version, ...rest } = project as { formatVersion: number }
  return rest
}

describe('readProject', () => {
  it.each(samples)('opens the %s sample', (name) => {
    const result = readProject(fixture(name))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.project.formatVersion).toBe(FORMAT_VERSION)
  })

  // Captured before v3 added the room: they must open into the same design,
  // standing on the back wall alone.
  it.each(['v1-minimal', 'v1-full', 'v2-full'])(
    'opens %s into the same design as when it was saved',
    (name) => {
      const result = readProject(fixture(name))
      if (!result.ok) throw new Error(`${name} didn't open`)
      expect(withoutVersion(result.project)).toEqual({
        ...(fixture(`${name}.expected`) as object),
        room: DEFAULT_ROOM,
      })
    },
  )

  it('keeps each part on its wall', () => {
    const result = readProject(fixture('v3-room'))
    if (!result.ok) throw new Error("v3-room didn't open")
    const walls = result.project.pieces.map((piece) => piece.wall ?? 'back')
    expect(new Set(walls)).toEqual(new Set(['back', 'left', 'right']))
    expect(result.project.room).toEqual({ left: true, right: true, width: 2600, depth: 2000 })
    // A box's panels are rebuilt on its wall.
    const box = result.project.boxes.find((candidate) => candidate.wall === 'left')!
    const panels = result.project.pieces.filter((piece) => piece.boxId === box.id)
    expect(panels.every((piece) => piece.wall === 'left')).toBe(true)
  })

  it('keeps doors and their options', () => {
    const result = readProject(fixture('v4-doors'))
    if (!result.ok) throw new Error("v4-doors didn't open")
    const doors = result.project.pieces.filter((piece) => piece.kind === 'door')
    expect(doors).toHaveLength(2)
    expect(doors[0]).toMatchObject({ double: true, depth: 18 })
    expect(doors[1]).toMatchObject({ hinge: 'right', inset: true, wall: 'left' })
  })

  it('drops door options on other parts, and a double door’s hinge side', () => {
    const save = backWallOnly()
    save.pieces.push(
      { id: 's', kind: 'shelf', x: 0, y: 0, width: 500, height: 18, depth: 300, inset: true },
      { id: 'd', kind: 'door', x: 0, y: 0, width: 600, height: 900, depth: 5, double: true, hinge: 'right' },
    )
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    const shelf = result.project.pieces.find((piece) => piece.id === 's')!
    const door = result.project.pieces.find((piece) => piece.id === 'd')!
    expect('inset' in shelf).toBe(false)
    expect(door).toMatchObject({ double: true, depth: 18 })
    expect('hinge' in door).toBe(false)
  })

  it('switches on a wall that has parts, so none are hidden', () => {
    const save = fixture('v3-room') as { room: object }
    save.room = { left: false, right: false, width: 2600, depth: 2000 }
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.room.left).toBe(true)
    expect(result.project.room.right).toBe(true)
  })

  it('falls back to a standard room when the room is damaged', () => {
    const save = backWallOnly()
    save.room = { width: -5, depth: 'deep' }
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.room).toEqual(DEFAULT_ROOM)
  })

  it('treats an unknown wall as the back wall', () => {
    const save = backWallOnly()
    save.pieces.push({ ...save.pieces[0], id: 'loose', boxId: undefined, wall: 'ceiling' })
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.pieces.some((piece) => 'wall' in piece)).toBe(false)
  })

  it('has a sample for every older version, so each upgrade step is tested', () => {
    for (let version = 1; version < FORMAT_VERSION; version++) {
      expect(samples.some((name) => name.startsWith(`v${version}-`))).toBe(true)
    }
    expect(samples.some((name) => name.startsWith(`v${FORMAT_VERSION}-`))).toBe(true)
  })

  it('fills in what older saves lacked', () => {
    const result = readProject(fixture('v1-minimal'))
    if (!result.ok) throw new Error("v1-minimal didn't open")
    expect(result.project.unitDepth).toBe(600)
    expect(result.project.boxes).toEqual([])
  })

  it('leaves the save it reads untouched', () => {
    const save = fixture('v1-full')
    const before = structuredClone(save)
    readProject(save)
    expect(save).toEqual(before)
  })

  it.each(['v1-full', 'v3-room', 'v4-doors'])('reads back what it writes (%s)', (name) => {
    const first = readProject(fixture(name))
    if (!first.ok) throw new Error(`${name} didn't open`)
    const saved = JSON.parse(JSON.stringify(toProjectData(first.project, first.project.name)))
    const second = readProject(saved)
    if (!second.ok) throw new Error("the re-saved project didn't open")
    expect(withoutVersion(second.project)).toEqual({
      ...withoutVersion(first.project),
      savedAt: second.project.savedAt,
    })
  })

  it('refuses a save from a newer version instead of guessing', () => {
    const save = { ...(fixture('v2-full') as object), formatVersion: FORMAT_VERSION + 1 }
    expect(readProject(save)).toEqual({ ok: false, problem: 'newer' })
  })

  it.each([
    ['nothing', null],
    ['a string', 'hello'],
    ['an unrelated object', { name: 'package' }],
    ['version 0', { formatVersion: 0, pieces: [] }],
    ['a text version', { formatVersion: '1', pieces: [] }],
    ['a fractional version', { formatVersion: 1.5, pieces: [] }],
    ['no parts list', { formatVersion: 1 }],
  ])('refuses %s as damaged', (_label, save) => {
    expect(readProject(save)).toEqual({ ok: false, problem: 'invalid' })
  })

  it('drops broken parts but keeps the rest', () => {
    const save = fixture('v1-minimal') as { pieces: unknown[] }
    save.pieces.push(null, { id: 'x', kind: 'spaceship' }, { id: 'y', kind: 'shelf', x: 'left' })
    const result = readProject(save)
    if (!result.ok) throw new Error("the damaged save didn't open")
    expect(result.project.pieces).toHaveLength(7)
  })
})
