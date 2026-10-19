import { describe, expect, it } from 'vitest'
import type { DriveClient, DriveFile } from './drive'
import { DEFAULT_THICKNESS } from './defaults'
import {
  type Links,
  type LocalProject,
  fileNameOf,
  linksFor,
  oneFilePerProject,
  planSync,
  projectNameOf,
  syncOnce,
} from './driveSync'
import { type ProjectData, parseProject, toProjectData } from './project'

const file = (id: string, projectId: string | null, modifiedTime = 't1', name = `${id}.json`): DriveFile => ({
  id,
  name,
  modifiedTime,
  projectId,
})
const project = (id: string, updatedAt = 'u1', name = id, problem = false): LocalProject => ({ id, name, updatedAt, problem })
const link = (fileId: string, modifiedTime = 't1', syncedAt = 'u1', syncedName = fileId.replace(/^f/, 'p')) => ({
  fileId,
  modifiedTime,
  syncedAt,
  syncedName,
})

describe('names', () => {
  it('turn a project name into a file name and back', () => {
    expect(fileNameOf('Kitchen')).toBe('Kitchen.json')
    expect(projectNameOf('Kitchen.json')).toBe('Kitchen')
    expect(projectNameOf('Kitchen.JSON')).toBe('Kitchen')
    expect(projectNameOf('.json')).toBe('Untitled project')
  })
})

describe('planSync', () => {
  it('uploads what is only here and imports what is only in Drive', () => {
    expect(planSync([project('p1')], {}, [])).toEqual([{ type: 'upload', id: 'p1' }])
    const remote = file('f2', 'p2')
    expect(planSync([], {}, [remote])).toEqual([{ type: 'import', id: 'p2', file: remote }])
  })

  it('does nothing when neither side changed since the last sync', () => {
    expect(planSync([project('p1')], { p1: link('f1') }, [file('f1', 'p1')])).toEqual([])
  })

  it('sends a change made here, including a rename', () => {
    const links: Links = { p1: link('f1') }
    expect(planSync([project('p1', 'u2')], links, [file('f1', 'p1')])).toEqual([{ type: 'push', id: 'p1', fileId: 'f1' }])
    expect(planSync([project('p1', 'u1', 'Renamed')], links, [file('f1', 'p1')])).toEqual([{ type: 'push', id: 'p1', fileId: 'f1' }])
  })

  it('fetches a change made in Drive', () => {
    const changed = file('f1', 'p1', 't2')
    expect(planSync([project('p1')], { p1: link('f1') }, [changed])).toEqual([{ type: 'pull', id: 'p1', file: changed }])
  })

  it('calls it a conflict when both changed, or when they were never linked', () => {
    const changed = file('f1', 'p1', 't2')
    expect(planSync([project('p1', 'u2')], { p1: link('f1') }, [changed])).toEqual([{ type: 'conflict', id: 'p1', file: changed }])
    const same = file('f1', 'p1')
    expect(planSync([project('p1')], {}, [same])).toEqual([{ type: 'conflict', id: 'p1', file: same }])
    expect(planSync([project('p1')], { p1: link('other') }, [same])).toEqual([{ type: 'conflict', id: 'p1', file: same }])
  })

  it('uploads again a project whose file is gone, and leaves a project that cannot be opened alone', () => {
    expect(planSync([project('p1')], { p1: link('f1') }, [])).toEqual([{ type: 'upload', id: 'p1' }])
    expect(planSync([project('p1', 'u2', 'p1', true)], {}, [file('f1', 'p1')])).toEqual([])
    expect(planSync([project('p1', 'u1', 'p1', true)], {}, [])).toEqual([])
  })
})

describe('oneFilePerProject', () => {
  it('keeps the linked file, else the newest, and drops files that are not projects', () => {
    const files = [file('a', 'p1', 't1'), file('b', 'p1', 't3'), file('c', 'p1', 't2'), file('n', null)]
    expect(oneFilePerProject(files, {}).map((f) => f.id)).toEqual(['b'])
    expect(oneFilePerProject(files, { p1: link('a') }).map((f) => f.id)).toEqual(['a'])
  })
})

describe('linksFor', () => {
  it('keeps links only for the folder they were made for, and only well-formed ones', () => {
    const stored = { folderId: 'F', links: { p1: link('f1'), p2: { fileId: 5 } } }
    expect(linksFor(stored, 'F')).toEqual({ p1: link('f1') })
    expect(linksFor(stored, 'other')).toEqual({})
    expect(linksFor(null, 'F')).toEqual({})
  })
})

// --- syncOnce, against an in-memory Drive and an in-memory set of projects ---

const data = (name: string): ProjectData => toProjectData({ pieces: [], thickness: DEFAULT_THICKNESS }, name)

function setup(options: { drive?: DriveFile[]; contents?: Record<string, unknown>; local?: LocalProject[]; links?: Links; trash?: string[]; unsaved?: string[] } = {}) {
  let clock = 0
  const drive = new Map((options.drive ?? []).map((f) => [f.id, f]))
  const contents = new Map(Object.entries(options.contents ?? {}))
  const trashed: string[] = []
  const local = new Map((options.local ?? []).map((p) => [p.id, { ...p, data: data(p.name) }]))
  let links: Links = options.links ?? {}
  let queue = options.trash ?? []
  const touch = () => `t${++clock + 10}`

  const client: DriveClient = {
    findFolder: async () => null,
    createFolder: async () => 'folder',
    listProjects: async () => [...drive.values()],
    getFile: async (id) => drive.get(id) ?? null,
    read: async (id) => contents.get(id),
    create: async (_folder, name, projectId, content) => {
      const created = { id: `f-${projectId}`, name, modifiedTime: touch(), projectId }
      drive.set(created.id, created)
      contents.set(created.id, content)
      return created
    },
    update: async (id, name, content) => {
      const updated = { ...drive.get(id)!, name, modifiedTime: touch() }
      drive.set(id, updated)
      contents.set(id, content)
      return updated
    },
    trash: async (id) => {
      trashed.push(id)
      drive.delete(id)
    },
  }
  const deps = {
    client,
    folderId: 'folder',
    local: {
      list: () => [...local.values()].map(({ id, name, updatedAt, problem }) => ({ id, name, updatedAt, problem })),
      flush: async () => {},
      hasUnsavedEdits: (id: string) => options.unsaved?.includes(id) ?? false,
      read: async (id: string) => {
        const found = local.get(id)
        return found && !found.problem ? { name: found.name, updatedAt: found.updatedAt, data: found.data } : null
      },
      write: async ({ id, name, data: written, updatedAt }: { id: string; name: string; data: ProjectData; updatedAt: string }) => {
        local.set(id, { id, name, updatedAt, problem: false, data: written })
      },
    },
    links: { get: () => links, set: (next: Links) => (links = next) },
    trash: { get: () => queue, set: (next: string[]) => (queue = next) },
    parse: parseProject,
  }
  return { deps, drive, contents, local, trashed, links: () => links, queue: () => queue }
}

describe('syncOnce', () => {
  it('uploads a new project as a file named for it and links it', async () => {
    const world = setup({ local: [project('p1', 'u1', 'Wardrobe')] })
    const result = await syncOnce(world.deps)
    expect(result.sent).toBe(1)
    const created = world.drive.get('f-p1')!
    expect(created.name).toBe('Wardrobe.json')
    expect(world.links().p1).toMatchObject({ fileId: 'f-p1', syncedAt: 'u1', syncedName: 'Wardrobe' })
    // A second round has nothing left to do.
    expect(await syncOnce(world.deps)).toMatchObject({ sent: 0, fetched: 0 })
  })

  it('imports a file from Drive as a project with its id, named after the file', async () => {
    const world = setup({
      drive: [file('f1', 'p9', 't5', 'Kitchen.json')],
      contents: { f1: data('ignored') },
    })
    const result = await syncOnce(world.deps)
    expect(result.fetched).toBe(1)
    expect(world.local.get('p9')).toMatchObject({ name: 'Kitchen', updatedAt: 't5' })
    expect(world.links().p9).toEqual({ fileId: 'f1', modifiedTime: 't5', syncedAt: 't5', syncedName: 'Kitchen' })
  })

  it('fetches a change from Drive over the project, and sends one made here', async () => {
    const world = setup({
      local: [project('p1', 'u1', 'p1'), project('p2', 'u2', 'p2')],
      drive: [file('f1', 'p1', 't2', 'Renamed.json'), file('f2', 'p2', 't1')],
      contents: { f1: data('x'), f2: data('y') },
      links: { p1: link('f1', 't1', 'u1', 'p1'), p2: link('f2', 't1', 'u1', 'p2') },
    })
    const result = await syncOnce(world.deps)
    expect(result).toMatchObject({ fetched: 1, sent: 1 })
    expect(world.local.get('p1')?.name).toBe('Renamed')
    expect(world.drive.get('f2')!.modifiedTime).not.toBe('t1')
  })

  it('keeps Drive’s version as a copy when both changed, then sends this one', async () => {
    const world = setup({
      local: [project('p1', 'u2', 'Mine')],
      drive: [file('f1', 'p1', 't2', 'Theirs.json')],
      contents: { f1: data('theirs') },
      links: { p1: link('f1', 't1', 'u1', 'Mine') },
    })
    const result = await syncOnce(world.deps)
    expect(result.conflicts).toBe(1)
    const names = [...world.local.values()].map((p) => p.name).sort()
    expect(names).toEqual(['Mine', 'Theirs (Drive copy)'])
    expect(world.drive.get('f1')!.name).toBe('Mine.json')
  })

  it('never replaces a file it cannot open, and leaves the project alone', async () => {
    const world = setup({
      local: [project('p1', 'u2', 'Mine')],
      drive: [file('f1', 'p1', 't2')],
      contents: { f1: { formatVersion: 9999 } },
      links: { p1: link('f1', 't1', 'u1', 'Mine') },
    })
    const result = await syncOnce(world.deps)
    expect(result).toMatchObject({ unreadable: 1, sent: 0, conflicts: 0 })
    expect(world.contents.get('f1')).toEqual({ formatVersion: 9999 })
  })

  it('waits to fetch over a project that has edits not saved yet', async () => {
    const world = setup({
      local: [project('p1')],
      drive: [file('f1', 'p1', 't2')],
      contents: { f1: data('x') },
      links: { p1: link('f1', 't1', 'u1', 'p1') },
      unsaved: ['p1'],
    })
    expect(await syncOnce(world.deps)).toMatchObject({ postponed: 1, fetched: 0 })
    expect(world.links().p1.modifiedTime).toBe('t1')
  })

  it('trashes the files of deleted projects and does not bring them back', async () => {
    const world = setup({
      drive: [file('f1', 'p1', 't1')],
      contents: { f1: data('x') },
      trash: ['f1'],
    })
    await syncOnce(world.deps)
    expect(world.trashed).toEqual(['f1'])
    expect(world.queue()).toEqual([])
    expect(world.local.size).toBe(0)
  })

  it('keeps a file queued for the trash while it cannot be reached, and does not import it', async () => {
    const world = setup({ drive: [file('f1', 'p1')], contents: { f1: data('x') }, trash: ['f1'] })
    world.deps.client.trash = async () => {
      throw new Error('down')
    }
    await syncOnce(world.deps)
    expect(world.queue()).toEqual(['f1'])
    expect(world.local.size).toBe(0)
  })

  it('follows a file that was moved out of the folder, and uploads again one that is gone', async () => {
    const moved = file('f1', 'p1', 't1')
    const world = setup({
      local: [project('p1'), project('p2')],
      contents: {},
      links: { p1: link('f1', 't1', 'u1', 'p1'), p2: link('f2', 't1', 'u1', 'p2') },
    })
    world.deps.client.getFile = async (id) => (id === 'f1' ? moved : null)
    const result = await syncOnce(world.deps)
    // p1 is unchanged on both sides; p2's file is gone, so it is made again.
    expect(result.sent).toBe(1)
    expect(world.links().p2.fileId).toBe('f-p2')
    expect(world.links().p1.fileId).toBe('f1')
  })
})
