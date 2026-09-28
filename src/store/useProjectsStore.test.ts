import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_THICKNESS } from '../lib/defaults'
import { FORMAT_VERSION, toProjectData } from '../lib/project'
import type { ProjectStorage, StoredProject } from '../lib/storage'
import { stubLocalStorage, stubPageEvents } from '../test/browser'

/** The projects "in the browser": an in-memory stand-in for IndexedDB. */
const memory = vi.hoisted(() => ({
  records: new Map<string, StoredProject>(),
  currentId: null as string | null,
  legacy: undefined as unknown,
  failing: false,
}))

vi.mock('../lib/storage', () => {
  const copy = <T,>(value: T): T => (value === undefined ? value : structuredClone(value))
  const storage: ProjectStorage = {
    list: async () => {
      if (memory.failing) throw new Error('storage blocked')
      return [...memory.records.values()].map(copy)
    },
    get: async (id) => copy(memory.records.get(id)),
    put: async (project) => void memory.records.set(project.id, copy(project)),
    remove: async (id) => void memory.records.delete(id),
    getCurrentId: async () => memory.currentId,
    setCurrentId: async (id) => void (memory.currentId = id),
    migrateLegacyDesign: async (convert) => {
      if (memory.legacy === undefined) return
      const project = convert(memory.legacy)
      if (!project) return
      memory.records.set(project.id, project)
      memory.legacy = undefined
    },
  }
  return { browserStorage: () => storage, requestPersistentStorage: async () => true }
})

const design = (pieces = 0) =>
  toProjectData({
    pieces: Array.from({ length: pieces }, (_, i) => ({
      id: `p${i}`,
      kind: 'shelf' as const,
      x: i * 600,
      y: 0,
      width: 500,
      height: 18,
      depth: 400,
    })),
    thickness: DEFAULT_THICKNESS,
  })
const record = (id: string, name: string, updatedAt: string, data: unknown = design()): StoredProject => ({
  id,
  name,
  createdAt: updatedAt,
  updatedAt,
  design: data,
})

/** A fresh app: new store modules over whatever is in `memory`. */
async function start() {
  const { useProjectsStore } = await import('./useProjectsStore')
  const { useDesignStore } = await import('./useDesignStore')
  await useProjectsStore.getState().init()
  return { projects: () => useProjectsStore.getState(), design: () => useDesignStore.getState() }
}

let page: ReturnType<typeof stubPageEvents>
beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  memory.records.clear()
  memory.currentId = null
  memory.legacy = undefined
  memory.failing = false
  stubLocalStorage()
  page = stubPageEvents()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('starting up', () => {
  it('creates and opens an empty project the first time', async () => {
    const { projects } = await start()
    expect(projects().projects.map((p) => p.name)).toEqual(['Untitled project'])
    expect(projects().currentId).toBe(projects().projects[0].id)
    expect(projects().saveStatus).toBe('saved')
    expect(memory.records.size).toBe(1)
  })

  it('reopens the project that was open last', async () => {
    memory.records.set('a', record('a', 'Hall', '2026-09-01T00:00:00Z', design(2)))
    memory.records.set('b', record('b', 'Kitchen', '2026-09-05T00:00:00Z'))
    memory.currentId = 'a'
    const { projects, design: open } = await start()
    expect(projects().currentId).toBe('a')
    expect(open().pieces).toHaveLength(2)
    // Most recently edited first.
    expect(projects().projects.map((p) => p.name)).toEqual(['Kitchen', 'Hall'])
  })

  it('never opens a project it can’t read, and leaves it untouched', async () => {
    const newer = { ...design(1), formatVersion: FORMAT_VERSION + 1 }
    memory.records.set('new', record('new', 'From the future', '2026-09-09T00:00:00Z', newer))
    memory.records.set('ok', record('ok', 'Hall', '2026-09-01T00:00:00Z'))
    memory.currentId = 'new'
    const { projects } = await start()
    expect(projects().currentId).toBe('ok')
    expect(projects().projects.find((p) => p.id === 'new')!.problem).toBe('newer')
    await projects().openProject('new')
    expect(projects().currentId).toBe('ok')
    expect(memory.records.get('new')!.design).toEqual(newer)
  })

  it('starts a new project when none can be read', async () => {
    memory.records.set('bad', record('bad', 'Broken', '2026-09-01T00:00:00Z', { formatVersion: 1 }))
    const { projects } = await start()
    expect(projects().projects).toHaveLength(2)
    expect(projects().currentId).not.toBe('bad')
    expect(projects().projects.find((p) => p.id === 'bad')!.problem).toBe('invalid')
  })

  it('turns the design saved before there were projects into "My first project"', async () => {
    memory.legacy = design(3)
    const { projects, design: open } = await start()
    expect(projects().projects.map((p) => p.name)).toEqual(['My first project'])
    expect(open().pieces).toHaveLength(3)
  })

  it('saves nothing when the browser’s storage can’t be opened', async () => {
    memory.failing = true
    const { projects } = await start()
    expect(projects().saveStatus).toBe('unavailable')
    await projects().createProject()
    expect(memory.records.size).toBe(0)
  })
})

describe('autosave', () => {
  it('saves half a second after the last change', async () => {
    const { projects, design: open } = await start()
    open().addPiece('shelf')
    expect(projects().saveStatus).toBe('saving')
    await vi.advanceTimersByTimeAsync(400)
    open().addPiece('divider')
    await vi.advanceTimersByTimeAsync(400)
    expect(readStored(projects().currentId!).pieces).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(readStored(projects().currentId!).pieces).toHaveLength(2)
    expect(projects().saveStatus).toBe('saved')
    expect(projects().projects[0].pieceCount).toBe(2)
  })

  it('saves at once when the tab is hidden or closed', async () => {
    const { projects, design: open } = await start()
    open().addPiece('shelf')
    page.hide()
    await vi.advanceTimersByTimeAsync(0)
    expect(readStored(projects().currentId!).pieces).toHaveLength(1)
    open().addPiece('shelf')
    page.fire('pagehide')
    await vi.advanceTimersByTimeAsync(0)
    expect(readStored(projects().currentId!).pieces).toHaveLength(2)
  })

  it('saves board names, settings and the room, not just parts', async () => {
    const { projects, design: open } = await start()
    open().setBoardName('front', 'Oak')
    await vi.advanceTimersByTimeAsync(500)
    expect(readStored(projects().currentId!).boardNames).toEqual({ front: 'Oak' })
    open().setRoom({ left: true })
    await vi.advanceTimersByTimeAsync(500)
    expect(readStored(projects().currentId!).room.left).toBe(true)
  })

  it('doesn’t count opening a project as a change', async () => {
    const { projects } = await start()
    expect(projects().saveStatus).toBe('saved')
  })
})

describe('managing projects', () => {
  it('creates a new project, saving the open one first', async () => {
    const { projects, design: open } = await start()
    const first = projects().currentId!
    open().addPiece('shelf')
    await projects().createProject()
    expect(readStored(first).pieces).toHaveLength(1)
    expect(projects().projects.map((p) => p.name)).toEqual(['Untitled project 2', 'Untitled project'])
    expect(open().pieces).toHaveLength(0)
  })

  it('creates a project from an opened file, under its name', async () => {
    const { projects, design: open } = await start()
    await projects().createProject({ name: 'From file', design: design(2) })
    expect(projects().projects[0].name).toBe('From file')
    expect(open().pieces).toHaveLength(2)
  })

  it('switches projects, saving the open one first', async () => {
    memory.records.set('other', record('other', 'Other', '2026-09-01T00:00:00Z', design(4)))
    memory.currentId = 'other'
    const { projects, design: open } = await start()
    await projects().createProject()
    const fresh = projects().currentId!
    open().addPiece('shelf')
    await projects().openProject('other')
    expect(open().pieces).toHaveLength(4)
    expect(readStored(fresh).pieces).toHaveLength(1)
    expect(memory.currentId).toBe('other')
  })

  it('renames a project, but not to nothing', async () => {
    memory.records.set('other', record('other', 'Other', '2026-09-01T00:00:00Z'))
    const { projects } = await start()
    await projects().createProject()
    const open = projects().currentId!
    await projects().renameProject(open, '  Bedroom  ')
    await projects().renameProject('other', 'Hall')
    await projects().renameProject('other', '   ')
    expect(memory.records.get(open)!.name).toBe('Bedroom')
    expect(memory.records.get('other')!.name).toBe('Hall')
  })

  it('duplicates a project as "<name> copy", numbered when taken', async () => {
    const { projects } = await start()
    const id = projects().currentId!
    await projects().duplicateProject(id)
    await projects().duplicateProject(id)
    expect(projects().projects.map((p) => p.name).sort()).toEqual([
      'Untitled project',
      'Untitled project copy',
      'Untitled project copy 2',
    ])
    // The copy isn't opened.
    expect(projects().currentId).toBe(id)
  })

  it('deletes a project, moving to another, or a new one when it was the last', async () => {
    memory.records.set('other', record('other', 'Other', '2026-09-01T00:00:00Z', design(2)))
    memory.currentId = 'other'
    const { projects, design: open } = await start()
    await projects().createProject()
    await projects().deleteProject(projects().currentId!)
    expect(projects().currentId).toBe('other')
    expect(open().pieces).toHaveLength(2)
    await projects().deleteProject('other')
    expect(projects().projects.map((p) => p.name)).toEqual(['Untitled project'])
    expect(memory.records.has('other')).toBe(false)
  })
})

/** The design stored for a project, as saved. */
function readStored(id: string) {
  return memory.records.get(id)!.design as ReturnType<typeof design>
}
