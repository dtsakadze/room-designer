import { describe, expect, it } from 'vitest'
import { FORMAT_VERSION, designOf, newDesign, opensIntact, readProject, toProjectData, versionOnly } from './project'
import { DEFAULT_ROOM } from './room'
import { MAX_LENGTH, MAX_PIECES, MAX_THICKNESS } from './defaults'
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

  // What each sample opens into today, part by part, so a change to how parts
  // are cleaned up (`normalizePiece`, `validate`) can't quietly change an old
  // save. If a change is meant to, look at the diff, then run Vitest with `-u`.
  it.each(samples)('opens %s into the design it opened into before', async (name) => {
    const result = readProject(fixture(name))
    if (!result.ok) throw new Error(`${name} didn't open`)
    const { savedAt: _savedAt, ...project } = result.project
    await expect(`${JSON.stringify(project, null, 2)}\n`).toMatchFileSnapshot(`./fixtures/opened/${name}.json`)
  })

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

  it('keeps sliding doors, and opens a save without them as before', () => {
    const save = fixture('v4-doors') as RawSave
    save.pieces.find((piece) => piece.kind === 'door')!.sliding = 3
    save.pieces.find((piece) => piece.kind === 'door')!.overlap = 80
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    const [door, other] = result.project.pieces.filter((piece) => piece.kind === 'door')
    expect(door).toMatchObject({ sliding: 3, overlap: 80 })
    expect(door).not.toHaveProperty('double')
    expect(other).not.toHaveProperty('sliding')
  })

  it('keeps the sliding doors in the v9 sample', () => {
    const result = readProject(fixture('v9-sliding'))
    if (!result.ok) throw new Error("v9-sliding didn't open")
    expect(result.project.pieces.find((piece) => piece.id === 'sliding-doors')).toMatchObject({
      sliding: 3,
      overlap: 80,
    })
  })

  it('keeps the trim and the ceiling in the v10 sample', () => {
    const result = readProject(fixture('v10-trim'))
    if (!result.ok) throw new Error("v10-trim didn't open")
    expect(result.project.room.height).toBe(2400)
    const trim = result.project.pieces.filter((piece) => piece.kind === 'cornice' || piece.kind === 'filler')
    expect(trim.map((piece) => piece.kind)).toEqual(['cornice', 'filler'])
    expect(trim.every((piece) => piece.depth === result.project.thickness.front)).toBe(true)
  })

  it('keeps the front-to-back positions in the v11 sample', () => {
    const result = readProject(fixture('v11-depth'))
    if (!result.ok) throw new Error("v11-depth didn't open")
    const { pieces, boxes } = result.project
    expect(boxes[0].z).toBe(40)
    expect(pieces.find((piece) => piece.id === 'filler-1')?.z).toBe(100)
    // The box's panels follow the box: its back panel at z, the rest in front of it.
    expect(pieces.find((piece) => piece.id === `${boxes[0].id}:back`)?.z).toBe(40)
    expect(pieces.find((piece) => piece.id === `${boxes[0].id}:left`)?.z).toBe(40 + result.project.thickness.back)
    // Older saves have none.
    const old = readProject(fixture('v10-trim'))
    if (!old.ok) throw new Error("v10-trim didn't open")
    expect(old.project.pieces.some((piece) => 'z' in piece)).toBe(false)
  })

  it('keeps a rod’s pull-down lift, and only on rods', () => {
    const result = readProject(fixture('v18-lift'))
    if (!result.ok) throw new Error("v18-lift didn't open")
    expect(result.project.pieces.find((piece) => piece.id === 'high-rod')?.lift).toBe(true)
    const bad = fixture('v18-lift') as { pieces: { id: string; kind: string; lift?: unknown }[] }
    bad.pieces.push({ id: 'shelf-lift', kind: 'shelf', lift: true, x: 0, y: 0, width: 500, height: 18, depth: 400 } as never)
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    expect(cleaned.project.pieces.find((piece) => piece.id === 'shelf-lift')).not.toHaveProperty('lift')
  })

  it('keeps accessories with their type, and turns an unknown type into a basket', () => {
    const result = readProject(fixture('v17-accessories'))
    if (!result.ok) throw new Error("v17-accessories didn't open")
    const types = result.project.pieces.filter((piece) => piece.kind === 'accessory').map((piece) => piece.accessory)
    expect(types).toEqual(['trouser', 'basket', 'basket', 'shoes-angled'])
    const bad = fixture('v17-accessories') as { pieces: { id: string; accessory?: unknown }[] }
    bad.pieces.find((piece) => piece.id === 'trousers')!.accessory = 'jacuzzi'
    delete bad.pieces.find((piece) => piece.id === 'shoes')!.accessory
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    const accessory = (id: string) => cleaned.project.pieces.find((piece) => piece.id === id)?.accessory
    expect([accessory('trousers'), accessory('shoes')]).toEqual(['basket', 'basket'])
    // Only accessories have a type.
    const shelf = fixture('v17-accessories') as { pieces: { id: string; accessory?: unknown; kind: string }[] }
    shelf.pieces.push({ id: 'shelf-typed', kind: 'shelf', accessory: 'tie', x: 0, y: 0, width: 500, height: 18, depth: 400 } as never)
    const typed = readProject(shelf)
    if (!typed.ok) throw new Error("the edited save didn't open")
    expect(typed.project.pieces.find((piece) => piece.id === 'shelf-typed')).not.toHaveProperty('accessory')
  })

  it('keeps the boards bought as whole sheets, and opens older saves as cut to size', () => {
    const result = readProject(fixture('v16-sheets'))
    if (!result.ok) throw new Error("v16-sheets didn't open")
    expect(result.project.boardSheets).toEqual({
      body: { length: 2800, width: 2070, kerf: 3 },
      front: { length: 2440, width: 1220, kerf: 4 },
    })
    const old = readProject(fixture('v15-panes'))
    if (!old.ok) throw new Error("v15-panes didn't open")
    expect(old.project).not.toHaveProperty('boardSheets')
    const bad = fixture('v16-sheets') as { boardSheets: unknown }
    bad.boardSheets = { body: { length: 'long', width: 100 }, front: { length: 99999, width: 1220 }, nonsense: { length: 1, width: 1 }, back: { length: 2000, width: 1000, kerf: 'wide' } }
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    expect(cleaned.project.boardSheets).toEqual({
      front: { length: 10000, width: 1220, kerf: 3 },
      back: { length: 2000, width: 1000, kerf: 3 },
    })
  })

  it('keeps glass and mirror doors, with their own thickness', () => {
    const result = readProject(fixture('v15-panes'))
    if (!result.ok) throw new Error("v15-panes didn't open")
    const door = (id: string) => result.project.pieces.find((piece) => piece.id === id)!
    expect(door('door-glass')).toMatchObject({ pane: 'glass', depth: 4 })
    expect(door('door-mirror')).toMatchObject({ pane: 'mirror', sliding: 2, depth: 4 })
    expect(door('door-board')).not.toHaveProperty('pane')
    const bad = fixture('v15-panes') as { pieces: { id: string; kind: string; pane?: unknown }[] }
    bad.pieces.find((piece) => piece.id === 'door-glass')!.pane = 'diamond'
    bad.pieces.push({ id: 'shelf-pane', kind: 'shelf', x: 0, y: 0, width: 500, height: 18, depth: 400, pane: 'glass' } as never)
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    expect(cleaned.project.pieces.find((piece) => piece.id === 'door-glass')).not.toHaveProperty('pane')
    expect(cleaned.project.pieces.find((piece) => piece.id === 'shelf-pane')).not.toHaveProperty('pane')
  })

  it('keeps what doors and drawers are opened with', () => {
    const result = readProject(fixture('v14-handles'))
    if (!result.ok) throw new Error("v14-handles didn't open")
    const handle = (id: string) => result.project.pieces.find((piece) => piece.id === id)?.handle
    expect(['door-profile', 'door-push', 'door-knobs', 'drawer-bar'].map(handle)).toEqual([
      'profile',
      'push',
      'knob',
      'bar',
    ])
    const bad = fixture('v14-handles') as { pieces: { id: string; handle?: unknown }[] }
    bad.pieces.find((piece) => piece.id === 'drawer-bar')!.handle = 'push'
    bad.pieces.find((piece) => piece.id === 'door-profile')!.handle = 'gold'
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    expect(cleaned.project.pieces.find((piece) => piece.id === 'drawer-bar')).not.toHaveProperty('handle')
    expect(cleaned.project.pieces.find((piece) => piece.id === 'door-profile')).not.toHaveProperty('handle')
  })

  it('keeps the joint type, and opens older saves with plain screws', () => {
    const result = readProject(fixture('v13-joints'))
    if (!result.ok) throw new Error("v13-joints didn't open")
    expect(result.project.joints).toBe('cam')
    const old = readProject(fixture('v12-materials'))
    if (!old.ok) throw new Error("v12-materials didn't open")
    expect(old.project).not.toHaveProperty('joints')
    const bad = fixture('v13-joints') as { joints: unknown }
    bad.joints = 'glue'
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    expect(cleaned.project).not.toHaveProperty('joints')
  })

  it('keeps board materials, and opens older saves as chipboard', () => {
    const result = readProject(fixture('v12-materials'))
    if (!result.ok) throw new Error("v12-materials didn't open")
    expect(result.project.boardMaterials).toEqual({ body: 'plywood', front: 'solid', back: 'mdf' })
    const old = readProject(fixture('v11-depth'))
    if (!old.ok) throw new Error("v11-depth didn't open")
    expect(old.project).not.toHaveProperty('boardMaterials')
    const bad = fixture('v12-materials') as { boardMaterials: unknown }
    bad.boardMaterials = { body: 'glass', front: 'chipboard', nonsense: 'mdf', drawer: 'mdf' }
    const cleaned = readProject(bad)
    if (!cleaned.ok) throw new Error("the edited save didn't open")
    expect(cleaned.project.boardMaterials).toEqual({ drawer: 'mdf' })
  })

  it('opens a save with no ceiling height as one without a ceiling', () => {
    const result = readProject(fixture('v8-colors'))
    if (!result.ok) throw new Error("v8-colors didn't open")
    expect(result.project.room).not.toHaveProperty('height')
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

  it('keeps board and edge colours, and gives older saves none', () => {
    const v8 = readProject(fixture('v8-colors'))
    if (!v8.ok) throw new Error("v8-colors didn't open")
    expect(v8.project.boardColors).toEqual({ body: '#f4f4f0', front: '#b08a5a' })
    expect(v8.project.edgeColors).toEqual({ body: '#b08a5a' })
    const v7 = readProject(fixture('v7-hinges'))
    if (!v7.ok) throw new Error("v7-hinges didn't open")
    expect(v7.project).not.toHaveProperty('boardColors')
    expect(v7.project).not.toHaveProperty('edgeColors')
  })

  it('drops colours of unknown boards and ones that aren’t #rrggbb', () => {
    const save = fixture('v8-colors') as { boardColors: unknown; edgeColors: unknown }
    save.boardColors = { body: 'red', front: '#123456', shelf: '#abcdef' }
    save.edgeColors = 'oak'
    const result = readProject(save)
    if (!result.ok) throw new Error("the save didn't open")
    expect(result.project.boardColors).toEqual({ front: '#123456' })
    expect(result.project).not.toHaveProperty('edgeColors')
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

  it.each(['v1-full', 'v3-room', 'v4-doors', 'v4-drawers', 'v4-drawer-fronts', 'v5-boards', 'v6-finish', 'v7-hinges', 'v8-colors', 'v9-sliding', 'v10-trim', 'v11-depth', 'v12-materials', 'v13-joints', 'v14-handles', 'v15-panes', 'v16-sheets', 'v17-accessories', 'v18-lift'])('reads back what it writes (%s)', (name) => {
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

  it('keeps damaged huge sizes and thicknesses within limits', () => {
    const save = fixture('v12-materials') as { pieces: Record<string, unknown>[]; thickness: Record<string, unknown> }
    save.pieces.push({ id: 'huge', kind: 'vertical', x: 0, y: 0, width: 18, height: 1e300, depth: 600 })
    save.thickness.body = 1e9
    const result = readProject(save)
    if (!result.ok) throw new Error("the edited save didn't open")
    expect(result.project.thickness.body).toBe(MAX_THICKNESS)
    expect(result.project.pieces.find((piece) => piece.id === 'huge')?.height).toBe(MAX_LENGTH)
  })

  it('keeps only the first part or box of each id, and a box’s panels over a loose part', () => {
    const save = fixture('v3-room') as RawSave & { boxes: Record<string, unknown>[] }
    const loose = save.pieces.find((piece) => !piece.boxId)!
    const box = save.boxes[0]
    save.pieces.push({ ...loose, x: Number(loose.x) + 1000 }, { ...loose, id: `${box.id}:left` })
    save.boxes.push({ ...box, x: Number(box.x) + 1000 })
    const result = readProject(save)
    if (!result.ok) throw new Error("the edited save didn't open")
    const { pieces, boxes } = result.project
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(pieces.length)
    expect(new Set(boxes.map((b) => b.id)).size).toBe(boxes.length)
    expect(pieces.find((piece) => piece.id === loose.id)!.x).toBe(loose.x)
    expect(boxes.find((b) => b.id === box.id)!.x).toBe(box.x)
    expect(pieces.find((piece) => piece.id === `${box.id}:left`)!.boxId).toBe(box.id)
  })

  it('refuses a save with more parts than any real design has', () => {
    const save = fixture('v1-minimal') as { pieces: Record<string, unknown>[] }
    const part = save.pieces[0]
    save.pieces = Array.from({ length: MAX_PIECES + 1 }, (_, i) => ({ ...part, id: `p${i}` }))
    expect(readProject(save)).toEqual({ ok: false, problem: 'invalid' })
  })

  it('drops parts and materials named after built-in object keys', () => {
    const save = fixture('v12-materials') as { pieces: unknown[]; boardMaterials: unknown }
    const count = save.pieces.length
    const names = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']
    save.pieces.push(...names.map((kind, i) => ({ id: `p${i}`, kind, x: 0, y: 0, width: 100, height: 100, depth: 100 })))
    save.boardMaterials = { body: '__proto__', front: 'toString', back: 'mdf' }
    const result = readProject(save)
    if (!result.ok) throw new Error("the edited save didn't open")
    expect(result.project.pieces).toHaveLength(count)
    expect(result.project.boardMaterials).toEqual({ back: 'mdf' })
  })
})

describe('toProjectData and designOf', () => {
  it('leaves settings at their default out of a save, and designOf puts them back', () => {
    const saved = toProjectData({ pieces: [], thickness: newDesign().thickness })
    expect(Object.keys(saved)).toEqual(['formatVersion', 'savedAt', 'thickness', 'holePitch', 'unitDepth', 'pieces', 'boxes', 'room'])
    expect(designOf(saved)).toEqual(newDesign())
  })

  it('saves changed settings in the same key order as a read save, and opens them again', () => {
    const design = {
      ...newDesign(),
      boardNames: { body: 'Oak' },
      boardMaterials: { back: 'mdf' as const },
      boardSheets: { body: { length: 2800, width: 2070, kerf: 4 } },
      joints: 'cam' as const,
      grainedBoards: ['body' as const],
      boardColors: { front: '#112233' },
      edgeColors: { body: '#445566' },
      defaultColor: '#778899',
    }
    const saved = toProjectData(design)
    const read = readProject(saved)
    expect(read.ok && Object.keys(read.project)).toEqual(Object.keys(saved))
    expect(designOf(saved)).toEqual(design)
  })

  it('takes undefined as the default', () => {
    expect(designOf({ boxes: undefined, unitDepth: undefined })).toEqual(newDesign())
  })
})

describe('opensIntact', () => {
  const opened = () => {
    const result = readProject(fixture('v3-room'))
    if (!result.ok) throw new Error("v3-room didn't open")
    return result.project
  }

  it('passes a design that opens again with every part', () => {
    const project = opened()
    expect(opensIntact(toProjectData(project))).toBe(true)
  })

  it('fails a design with a part that opening would drop', () => {
    const project = opened()
    const broken = { ...project.pieces.find((piece) => !piece.boxId)!, id: 'broken', x: Number.NaN }
    expect(opensIntact(toProjectData({ ...project, pieces: [...project.pieces, broken] }))).toBe(false)
  })
})

describe('versionOnly', () => {
  it('makes a step that changes nothing but the version, and leaves its input alone', () => {
    const save = { formatVersion: 18, pieces: [], name: 'Hall' }
    expect(versionOnly(19)(save)).toEqual({ formatVersion: 19, pieces: [], name: 'Hall' })
    expect(save.formatVersion).toBe(18)
  })
})
