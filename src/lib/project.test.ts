import { describe, expect, it } from 'vitest'
import { FORMAT_VERSION, readProject, toProjectData } from './project'
import { DEFAULT_ROOM } from './room'
import type { Piece } from '../types'

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

  // Captured before v3 added the room, v5 the fronts and drawer-box boards
  // and v6 shelf-pin holes: they must open into the same design, standing on
  // the back wall alone, with fronts and drawer boxes cut from the body board
  // as before, and shelves where they were.
  it.each(['v1-minimal', 'v1-full', 'v2-full'])(
    'opens %s into the same design as when it was saved',
    (name) => {
      const result = readProject(fixture(name))
      if (!result.ok) throw new Error(`${name} didn't open`)
      const expected = fixture(`${name}.expected`) as { thickness: { body: number } }
      const { body } = expected.thickness
      expect(withoutVersion(result.project)).toEqual({
        ...expected,
        thickness: { ...expected.thickness, front: body, drawer: body },
        holePitch: 32,
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

  it('keeps each drawer’s runner type', () => {
    const result = readProject(fixture('v4-drawers'))
    if (!result.ok) throw new Error("v4-drawers didn't open")
    const drawers = result.project.pieces.filter((piece) => piece.kind === 'drawer')
    expect(drawers.map((drawer) => drawer.extension)).toEqual(['full', undefined, undefined])
  })

  it('keeps overlay drawer fronts', () => {
    const result = readProject(fixture('v4-drawer-fronts'))
    if (!result.ok) throw new Error("v4-drawer-fronts didn't open")
    const drawers = result.project.pieces.filter((piece) => piece.kind === 'drawer')
    expect(drawers.map((drawer) => drawer.overlay)).toEqual([true, true])
  })

  it('gives v4 saves fronts and drawer boxes of their body board, so nothing changes', () => {
    const save = fixture('v4-drawers') as { thickness: Record<string, number> }
    save.thickness = { body: 16, back: 4 }
    const result = readProject(save)
    if (!result.ok) throw new Error("v4-drawers didn't open")
    expect(result.project.thickness).toEqual({ body: 16, back: 4, front: 16, drawer: 16 })
    expect(result.project).not.toHaveProperty('boardNames')
  })

  it('keeps each board’s thickness and name', () => {
    const result = readProject(fixture('v5-boards'))
    if (!result.ok) throw new Error("v5-boards didn't open")
    expect(result.project.thickness).toEqual({ body: 18, back: 3, front: 19, drawer: 15 })
    expect(result.project.boardNames).toEqual({
      body: '18 mm white melamine',
      back: '3 mm white HDF',
      front: '19 mm oak-veneer MDF',
      drawer: '15 mm birch plywood',
    })
    // Doors take the fronts board.
    const door = result.project.pieces.find((piece) => piece.kind === 'door')!
    expect(door.depth).toBe(19)
  })

  it('drops board names that are empty, unknown or not text, and trims long ones', () => {
    const save = fixture('v5-boards') as { boardNames: unknown }
    save.boardNames = { body: '  ', back: 42, front: 'x'.repeat(100), shelf: 'Oak' }
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.boardNames).toEqual({ front: 'x'.repeat(60) })
  })

  it('opens v5 saves with no grain and every part’s usual banding', () => {
    const result = readProject(fixture('v5-boards'))
    if (!result.ok) throw new Error("v5-boards didn't open")
    expect(result.project).not.toHaveProperty('grainedBoards')
    expect(result.project.pieces.some((piece) => 'bands' in piece || 'grain' in piece)).toBe(false)
  })

  it('keeps boards with grain, and each part’s own banding and grain', () => {
    const result = readProject(fixture('v6-finish'))
    if (!result.ok) throw new Error("v6-finish didn't open")
    expect(result.project.grainedBoards).toEqual(['body', 'front'])
    const of = (match: (piece: Piece) => boolean) => result.project.pieces.find(match)!
    expect(of((piece) => piece.id.endsWith(':top')).bands).toEqual(['front', 'left', 'right'])
    expect(of((piece) => piece.kind === 'door').grain).toBe('width')
    expect(of((piece) => piece.kind === 'drawer').grain).toBe('height')
    expect(of((piece) => piece.id === 'open-shelf')).toMatchObject({
      bands: ['front', 'back', 'left', 'right'],
      grain: 'depth',
    })
  })

  it('keeps the hole spacing, gives older saves the usual one, and fixes a damaged one', () => {
    const v7 = readProject(fixture('v7-hinges'))
    if (!v7.ok) throw new Error("v7-hinges didn't open")
    expect(v7.project.holePitch).toBe(37)
    const v6 = readProject(fixture('v6-finish'))
    if (!v6.ok) throw new Error("v6-finish didn't open")
    expect(v6.project.holePitch).toBe(32)
    const save = fixture('v7-hinges') as { holePitch: unknown }
    save.holePitch = 'wide'
    const damaged = readProject(save)
    if (!damaged.ok) throw new Error("the save didn't open")
    expect(damaged.project.holePitch).toBe(32)
  })

  it('keeps doors’ hinges, and gives older doors standard ones', () => {
    const v7 = readProject(fixture('v7-hinges'))
    if (!v7.ok) throw new Error("v7-hinges didn't open")
    const doors = v7.project.pieces.filter((piece) => piece.kind === 'door')
    expect(doors.map((door) => [door.openAngle, door.softClose])).toEqual([
      [155, true],
      [undefined, undefined],
    ])
    const v6 = readProject(fixture('v6-finish'))
    if (!v6.ok) throw new Error("v6-finish didn't open")
    const door = v6.project.pieces.find((piece) => piece.kind === 'door')!
    expect(door).not.toHaveProperty('openAngle')
    expect(door).not.toHaveProperty('softClose')
  })

  it('keeps a drawer’s runner closing, and gives older drawers ordinary runners', () => {
    const v7 = readProject(fixture('v7-hinges'))
    if (!v7.ok) throw new Error("v7-hinges didn't open")
    expect(v7.project.pieces.find((piece) => piece.kind === 'drawer')!.close).toBe('push')
    const v6 = readProject(fixture('v6-finish'))
    if (!v6.ok) throw new Error("v6-finish didn't open")
    expect(v6.project.pieces.find((piece) => piece.kind === 'drawer')).not.toHaveProperty('close')
  })

  it('keeps a door or drawer without a handle', () => {
    const save = fixture('v7-hinges') as { pieces: Record<string, unknown>[] }
    const drawer = save.pieces.find((piece) => piece.kind === 'drawer')!
    drawer.noHandle = true
    const shelf = save.pieces.find((piece) => piece.id === 'open-shelf')!
    shelf.noHandle = true
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.pieces.find((piece) => piece.id === drawer.id)!.noHandle).toBe(true)
    expect(result.project.pieces.find((piece) => piece.id === 'open-shelf')).not.toHaveProperty('noHandle')
  })

  it('drops an opening angle hinges don’t come in, and hinge options on other parts', () => {
    const save = fixture('v7-hinges') as { pieces: Record<string, unknown>[] }
    const door = save.pieces.find((piece) => piece.kind === 'door')!
    door.openAngle = 133
    const shelf = save.pieces.find((piece) => piece.id === 'open-shelf')!
    Object.assign(shelf, { openAngle: 155, softClose: true })
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    const read = (id: unknown) => result.project.pieces.find((piece) => piece.id === id)!
    expect(read(door.id)).not.toHaveProperty('openAngle')
    expect(read(door.id).softClose).toBe(true)
    expect(read('open-shelf')).not.toHaveProperty('openAngle')
    expect(read('open-shelf')).not.toHaveProperty('softClose')
  })

  it('drops unknown boards with grain, and banding or grain a part can’t have', () => {
    const save = fixture('v6-finish') as { grainedBoards: unknown; pieces: Record<string, unknown>[] }
    save.grainedBoards = ['front', 'oak', 'front', 7]
    const shelf = save.pieces.find((piece) => piece.id === 'open-shelf')!
    shelf.bands = ['front', 'top', 'sideways', 3]
    shelf.grain = 'height'
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.grainedBoards).toEqual(['front'])
    const read = result.project.pieces.find((piece) => piece.id === 'open-shelf')!
    // Front alone is a shelf's usual banding, so it isn't stored.
    expect(read).not.toHaveProperty('bands')
    expect(read).not.toHaveProperty('grain')
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

  it.each(['v1-full', 'v3-room', 'v4-doors', 'v4-drawers', 'v4-drawer-fronts', 'v5-boards', 'v6-finish', 'v7-hinges'])('reads back what it writes (%s)', (name) => {
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
