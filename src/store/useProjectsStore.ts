import { create } from 'zustand'
import { DEFAULT_THICKNESS } from '../lib/defaults'
import { type ProjectData, parseProject, toProjectData } from '../lib/project'
import { type StoredProject, browserStorage } from '../lib/storage'
import { useDesignStore } from './useDesignStore'

export type SaveStatus = 'loading' | 'blocked' | 'saving' | 'saved' | 'unavailable'

export type ProjectSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  pieceCount: number
}

type ProjectsState = {
  saveStatus: SaveStatus
  currentId: string | null
  /** Most recently edited first. */
  projects: ProjectSummary[]

  /** Loads the project list and reopens the last project. Safe to call twice. */
  init: () => Promise<void>
  /** A new project (empty, or from an opened file), which becomes the open one. */
  createProject: (from?: { name?: string; design?: ProjectData }) => Promise<void>
  openProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  /** Deleting the open project moves to the most recent other one, or a new one. */
  deleteProject: (id: string) => Promise<void>
}

const DEFAULT_NAME = 'Untitled project'
const MIGRATED_NAME = 'My first project'
/** Waits this long after the last change, so a drag saves once, not per move. */
const SAVE_DELAY = 500

const storage = browserStorage({
  onBlocked: () => useProjectsStore.setState({ saveStatus: 'blocked' }),
})
let started = false
/** The open design has changes that aren't in storage yet. */
let pending = false
let timer: ReturnType<typeof setTimeout> | undefined
/** Set while a project is being loaded, so loading it doesn't count as an edit. */
let applying = false

export const useProjectsStore = create<ProjectsState>()((set, get) => {
  /**
   * Writes the open design to its project now. Everything up to the storage
   * write runs in the same turn, so this still works while the page closes.
   */
  const saveNow = async () => {
    clearTimeout(timer)
    const { currentId, projects } = get()
    const meta = projects.find((project) => project.id === currentId)
    if (!pending || !meta) return
    pending = false

    const design = useDesignStore.getState()
    const updatedAt = new Date().toISOString()
    set({
      projects: sortByEdited(
        projects.map((project) =>
          project.id === meta.id ? { ...project, updatedAt, pieceCount: design.pieces.length } : project,
        ),
      ),
    })
    try {
      await storage.put({
        id: meta.id,
        name: meta.name,
        createdAt: meta.createdAt,
        updatedAt,
        design: toProjectData(design),
      })
      if (!pending) set({ saveStatus: 'saved' })
    } catch (error) {
      console.error('Autosave failed', error)
      set({ saveStatus: 'unavailable' })
    }
  }

  const apply = (design: ProjectData) => {
    applying = true
    useDesignStore.getState().loadProject(design)
    applying = false
  }

  const startAutosave = () => {
    useDesignStore.subscribe((state, previous) => {
      if (applying) return
      const unchanged =
        state.pieces === previous.pieces &&
        state.thickness === previous.thickness &&
        state.unitDepth === previous.unitDepth
      if (unchanged) return
      pending = true
      set({ saveStatus: 'saving' })
      clearTimeout(timer)
      timer = setTimeout(saveNow, SAVE_DELAY)
    })
    // A change made just before the tab is hidden or closed is written at once.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void saveNow()
    })
    window.addEventListener('pagehide', () => void saveNow())
  }

  const usable = () => ['saving', 'saved'].includes(get().saveStatus)

  return {
    saveStatus: 'loading',
    currentId: null,
    projects: [],

    init: async () => {
      if (started) return
      started = true
      try {
        await storage.migrateLegacyDesign((legacy) => {
          const design = parseProject(legacy)
          if (!design) return null
          return newRecord(MIGRATED_NAME, design, design.savedAt)
        })

        let records = await storage.list()
        if (records.length === 0) {
          const first = newRecord(DEFAULT_NAME, emptyDesign())
          await storage.put(first)
          records = [first]
        }

        const lastId = await storage.getCurrentId()
        const current =
          records.find((record) => record.id === lastId) ?? sortByEdited(records)[0]
        const design = parseProject(current.design)
        if (!design) console.warn('Opening an empty design: this project cannot be read', current)

        set({
          projects: sortByEdited(records.map(summarize)),
          currentId: current.id,
          saveStatus: 'saved',
        })
        apply(design ?? emptyDesign())
        await storage.setCurrentId(current.id)
        startAutosave()
      } catch (error) {
        // Private windows and blocked site data can refuse IndexedDB. Nothing
        // is saved then, so a read that failed for a passing reason can't be
        // followed by a save that overwrites what's really there.
        console.error('Could not open browser storage', error)
        set({ saveStatus: 'unavailable' })
      }
    },

    createProject: async (from) => {
      if (!usable()) return
      await saveNow()
      const names = get().projects.map((project) => project.name)
      const design = from?.design ?? emptyDesign()
      const record = newRecord(from?.name ?? untitledName(names), design)
      await storage.put(record)
      await storage.setCurrentId(record.id)
      set({ projects: [summarize(record), ...get().projects], currentId: record.id })
      apply(design)
    },

    openProject: async (id) => {
      if (!usable() || id === get().currentId) return
      await saveNow()
      const record = await storage.get(id)
      if (!record) return
      const design = parseProject(record.design)
      if (!design) console.warn('Opening an empty design: this project cannot be read', record)
      set({ currentId: id })
      apply(design ?? emptyDesign())
      await storage.setCurrentId(id)
    },

    renameProject: async (id, name) => {
      const trimmed = name.trim()
      if (!usable() || !trimmed) return
      set({
        projects: get().projects.map((project) =>
          project.id === id ? { ...project, name: trimmed } : project,
        ),
      })
      if (id === get().currentId) {
        // The open project is written by the autosave, which reads the name
        // from the list. A separate read-then-write here could put back an
        // older design over an edit that was saving at the same time.
        pending = true
        await saveNow()
        return
      }
      const record = await storage.get(id)
      if (record) await storage.put({ ...record, name: trimmed })
    },

    deleteProject: async (id) => {
      if (!usable()) return
      const isOpen = id === get().currentId
      if (isOpen) {
        // Nothing left to save for it.
        pending = false
        clearTimeout(timer)
      }
      await storage.remove(id)
      const remaining = get().projects.filter((project) => project.id !== id)
      set({ projects: remaining })
      if (!isOpen) return
      if (remaining.length > 0) await get().openProject(remaining[0].id)
      else await get().createProject()
    },
  }
})

const emptyDesign = () => toProjectData({ pieces: [], thickness: DEFAULT_THICKNESS })

function newRecord(name: string, design: ProjectData, createdAt = new Date().toISOString()): StoredProject {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  // The name lives on the record; it's only put in the design for saved files.
  const { name: _fileName, ...rest } = design
  return { id, name, createdAt, updatedAt: createdAt, design: rest }
}

function summarize(record: StoredProject): ProjectSummary {
  const pieces = (record.design as { pieces?: unknown } | null)?.pieces
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    pieceCount: Array.isArray(pieces) ? pieces.length : 0,
  }
}

const sortByEdited = <T extends { updatedAt: string }>(list: T[]) =>
  [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

/** "Untitled project", then "Untitled project 2", 3, … skipping names in use. */
function untitledName(taken: string[]) {
  if (!taken.includes(DEFAULT_NAME)) return DEFAULT_NAME
  let n = 2
  while (taken.includes(`${DEFAULT_NAME} ${n}`)) n++
  return `${DEFAULT_NAME} ${n}`
}
