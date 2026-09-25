import { create } from 'zustand'
import { DEFAULT_THICKNESS } from '../lib/defaults'
import {
  type ProjectData,
  type ReadProblem,
  parseProject,
  readProject,
  toProjectData,
} from '../lib/project'
import { type StoredProject, browserStorage } from '../lib/storage'
import type { Piece } from '../types'
import { useDesignStore } from './useDesignStore'

export type SaveStatus = 'loading' | 'blocked' | 'saving' | 'saved' | 'unavailable'

export type ProjectSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  pieceCount: number
  /** The design's parts, for drawing its thumbnail in the project list. */
  pieces: Piece[]
  /**
   * Why it can't be opened (saved by a newer version of the app, or damaged),
   * or null if it can. Such a project is never opened, so nothing overwrites it.
   */
  problem: ReadProblem | null
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
  /** A copy named "<name> copy"; the open project stays open. */
  duplicateProject: (id: string) => Promise<void>
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
          project.id === meta.id
            ? { ...project, updatedAt, pieceCount: design.pieces.length, pieces: design.pieces }
            : project,
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
        state.boxes === previous.boxes &&
        state.defaultColor === previous.defaultColor &&
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

        // Only a project that reads cleanly is opened. Opening one that doesn't
        // (made by a newer version, or damaged) as an empty design would let the
        // next autosave wipe it, so those are left untouched in the list.
        const readable = records.flatMap((record) => {
          const result = readProject(record.design)
          return result.ok ? [{ record, design: result.project }] : []
        })
        const lastId = await storage.getCurrentId()
        const newest = [...readable].sort((a, b) =>
          b.record.updatedAt.localeCompare(a.record.updatedAt),
        )[0]
        let current = readable.find(({ record }) => record.id === lastId) ?? newest
        if (!current) {
          const design = emptyDesign()
          const first = newRecord(DEFAULT_NAME, design)
          await storage.put(first)
          records = [...records, first]
          current = { record: first, design }
        }

        set({
          projects: sortByEdited(records.map(summarize)),
          currentId: current.record.id,
          saveStatus: 'saved',
        })
        apply(current.design)
        await storage.setCurrentId(current.record.id)
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
      // Never open what can't be read: autosave would then overwrite it.
      const design = parseProject(record.design)
      if (!design) return
      set({ currentId: id })
      apply(design)
      await storage.setCurrentId(id)
    },

    duplicateProject: async (id) => {
      if (!usable()) return
      // The open project's latest edits may not be in storage yet.
      if (id === get().currentId) await saveNow()
      const source = await storage.get(id)
      if (!source) return
      const names = get().projects.map((project) => project.name)
      const now = new Date().toISOString()
      const copy: StoredProject = {
        ...source,
        id: newId(),
        name: copyName(source.name, names),
        createdAt: now,
        updatedAt: now,
      }
      await storage.put(copy)
      set({ projects: [summarize(copy), ...get().projects] })
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
      const next = remaining.find((project) => !project.problem)
      if (next) await get().openProject(next.id)
      else await get().createProject()
    },
  }
})

const emptyDesign = () => toProjectData({ pieces: [], thickness: DEFAULT_THICKNESS })

function newRecord(name: string, design: ProjectData, createdAt = new Date().toISOString()): StoredProject {
  const id = newId()
  // The name lives on the record; it's only put in the design for saved files.
  const { name: _fileName, ...rest } = design
  return { id, name, createdAt, updatedAt: createdAt, design: rest }
}

function summarize(record: StoredProject): ProjectSummary {
  const result = readProject(record.design)
  const pieces = result.ok ? result.project.pieces : []
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    pieceCount: pieces.length,
    pieces,
    problem: result.ok ? null : result.problem,
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

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/** "Kitchen copy", then "Kitchen copy 2", 3, … skipping names in use. */
function copyName(name: string, taken: string[]) {
  const base = `${name} copy`
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base} ${n}`)) n++
  return `${base} ${n}`
}
