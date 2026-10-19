import { create } from 'zustand'
import { AuthError, DriveError, driveClient } from '../lib/drive'
import { canPickFolder, driveAvailable } from '../lib/driveConfig'
import { type Links, type SyncResult, linksFor, syncOnce } from '../lib/driveSync'
import { accessToken, pickFolder, signIn, signOut, signedIn } from '../lib/googleAuth'
import { parseProject } from '../lib/project'
import { readPref, writePref } from '../lib/prefs'
import { useProjectsStore } from './useProjectsStore'

export type DriveStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'reconnect' | 'error'

/** The sync's state in a few words, for the sidebar and this page. */
export const DRIVE_LABELS: Record<DriveStatus, string> = {
  off: 'Off',
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  reconnect: 'Reconnect',
  error: 'Not synced',
}

type DriveState = {
  /** This build can sync with Drive (it has a Google client id). */
  available: boolean
  connected: boolean
  status: DriveStatus
  /** What went wrong or what the last sync did, for the Settings page. */
  message: string | null
  lastSyncedAt: string | null
  /** Where the Boardcut folder is: the folder that was chosen, or My Drive. */
  parentName: string | null

  /** Starts syncing, if it was on before. Safe to call twice. */
  init: () => void
  /** Signs in, asks where to keep the folder, and syncs. Call it from a click. */
  connect: () => Promise<void>
  /** Signs in again after the sign-in ran out. Call it from a click. */
  reconnect: () => Promise<void>
  /** Stops syncing. Nothing is deleted, here or in Drive. */
  disconnect: () => void
  syncNow: () => Promise<void>
}

// Stored in this browser only; same prefix as every other stored name.
const CONFIG_KEY = 'room-designer:drive'
const LINKS_KEY = 'room-designer:drive-links'
const TRASH_KEY = 'room-designer:drive-trash'

const FOLDER_NAME = 'Boardcut'
/** Waits this long after the last save, so a burst of edits goes up once. */
const PUSH_DELAY = 1500
/** How often Drive is looked at for changes made elsewhere, while the page is in view. */
const POLL_MS = 60_000

type Config = { folderId: string; parentName: string }

function readJson(key: string): unknown {
  try {
    return JSON.parse(readPref(key) ?? 'null')
  } catch {
    return null
  }
}

function readConfig(): Config | null {
  const stored = readJson(CONFIG_KEY) as Partial<Config> | null
  return typeof stored?.folderId === 'string' && typeof stored.parentName === 'string'
    ? { folderId: stored.folderId, parentName: stored.parentName }
    : null
}

const readLinks = (folderId: string) => linksFor(readJson(LINKS_KEY) as { folderId?: unknown; links?: unknown } | null, folderId)
const writeLinks = (folderId: string, links: Links) => writePref(LINKS_KEY, JSON.stringify({ folderId, links }))

const readTrash = (): string[] => {
  const stored = readJson(TRASH_KEY)
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
}
const writeTrash = (fileIds: string[]) => writePref(TRASH_KEY, JSON.stringify(fileIds))

let started = false
let running = false
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Runs `work` unless another tab is already syncing, as two at once would upload the same project twice. */
async function exclusively<T>(work: () => Promise<T>): Promise<T | null> {
  if (!navigator.locks) return work()
  return navigator.locks.request('room-designer:drive-sync', { ifAvailable: true }, (lock) => (lock ? work() : null))
}

const summary = (result: SyncResult) => {
  const parts = [
    result.sent && `${result.sent} sent`,
    result.fetched && `${result.fetched} fetched`,
    result.conflicts && `${result.conflicts} changed in both places: Drive's version is kept as a copy named "… (Drive copy)"`,
    result.unreadable && `${result.unreadable} file${result.unreadable === 1 ? '' : 's'} in Drive can't be opened (made by a newer version or damaged) and left as they are`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export const useDriveStore = create<DriveState>()((set, get) => {
  const schedule = (delay: number) => {
    clearTimeout(timer)
    if (get().connected) timer = setTimeout(() => void run(), delay)
  }

  const failed = (error: unknown) => {
    if (error instanceof AuthError) set({ status: 'reconnect', message: 'Sign in to Google again to carry on syncing.' })
    else if (error instanceof DriveError && error.status === 0) set({ status: 'offline', message: 'No connection. Changes are sent when it is back.' })
    else {
      console.error('Drive sync failed', error)
      set({ status: 'error', message: error instanceof Error ? error.message : 'Syncing with Google Drive failed.' })
    }
  }

  const run = async () => {
    const config = readConfig()
    if (!get().connected || !config) return
    if (running) {
      again = true
      return
    }
    if (navigator.onLine === false) return set({ status: 'offline', message: 'No connection. Changes are sent when it is back.' })
    running = true
    set({ status: 'syncing' })
    try {
      const { folderId } = config
      const projects = useProjectsStore
      const result = await exclusively(() =>
        syncOnce({
          client: driveClient(accessToken),
          folderId,
          local: {
            list: () =>
              projects.getState().projects.map(({ id, name, updatedAt, problem }) => ({ id, name, updatedAt, problem: problem !== null })),
            flush: () => projects.getState().flush(),
            hasUnsavedEdits: (id) => projects.getState().hasUnsavedEdits(id),
            read: async (id) => {
              const record = await projects.getState().readStored(id)
              const data = record && parseProject(record.design)
              return record && data ? { name: record.name, updatedAt: record.updatedAt, data } : null
            },
            write: ({ id, name, data, updatedAt }) => projects.getState().saveSynced({ id, name, design: data, updatedAt }),
          },
          links: { get: () => readLinks(folderId), set: (links) => writeLinks(folderId, links) },
          trash: { get: readTrash, set: writeTrash },
          parse: parseProject,
        }),
      )
      set({ status: 'idle', lastSyncedAt: new Date().toISOString(), message: result && summary(result) })
    } catch (error) {
      failed(error)
    } finally {
      running = false
      if (again) {
        again = false
        schedule(PUSH_DELAY)
      }
    }
  }

  /** A project deleted here: its file goes to the trash too, now or when there is a connection. */
  const forget = (id: string) => {
    const stored = readJson(LINKS_KEY) as { folderId?: string; links?: Links } | null
    const link = stored?.links?.[id]
    if (!stored || !link) return
    const { [id]: _gone, ...rest } = stored.links!
    writePref(LINKS_KEY, JSON.stringify({ ...stored, links: rest }))
    writeTrash([...new Set([...readTrash(), link.fileId])])
  }

  return {
    available: driveAvailable,
    connected: false,
    status: 'off',
    message: null,
    lastSyncedAt: null,
    parentName: null,

    init: () => {
      if (started || !driveAvailable) return
      started = true
      // Watches the project list: deleting a project trashes its file, and a
      // saved, renamed or new project is sent.
      useProjectsStore.subscribe((state, previous) => {
        const kept = new Set(state.projects.map((project) => project.id))
        const deleted = previous.projects.filter((project) => !kept.has(project.id))
        deleted.forEach((project) => forget(project.id))
        const before = new Map(previous.projects.map((project) => [project.id, project]))
        const changed = state.projects.some((project) => {
          const old = before.get(project.id)
          return !old || old.updatedAt !== project.updatedAt || old.name !== project.name
        })
        if (changed || deleted.length > 0) schedule(PUSH_DELAY)
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') schedule(0)
      })
      window.addEventListener('online', () => schedule(0))
      setInterval(() => {
        if (document.visibilityState === 'visible') schedule(0)
      }, POLL_MS)

      const config = readConfig()
      if (!config) return
      set({ connected: true, parentName: config.parentName, status: 'syncing' })
      // A new visit has no token. Where the browser allows, it is renewed
      // without asking; otherwise the Settings page and the sidebar say to reconnect.
      void (signedIn() ? Promise.resolve() : signIn('quiet'))
        .then(() => schedule(0))
        .catch(failed)
    },

    connect: async () => {
      set({ status: 'syncing', message: null })
      try {
        const token = await signIn('consent')
        const parent = canPickFolder ? await pickFolder(token) : null
        if (canPickFolder && !parent) {
          set({ status: get().connected ? 'idle' : 'off' })
          return
        }
        const client = driveClient(accessToken)
        const parentId = parent?.id ?? null
        const folderId = (await client.findFolder(FOLDER_NAME, parentId)) ?? (await client.createFolder(FOLDER_NAME, parentId))
        const parentName = parent?.name ?? 'My Drive'
        writePref(CONFIG_KEY, JSON.stringify({ folderId, parentName }))
        set({ connected: true, parentName })
        schedule(0)
      } catch (error) {
        // Still connected if it was before, as only the new connection failed.
        failed(error)
        if (!get().connected) set({ status: 'off' })
      }
    },

    reconnect: async () => {
      set({ status: 'syncing', message: null })
      try {
        await signIn('consent')
        schedule(0)
      } catch (error) {
        failed(error)
      }
    },

    disconnect: () => {
      clearTimeout(timer)
      signOut()
      // The links stay, so connecting to the same folder again carries on
      // where it stopped instead of treating every project as new.
      writePref(CONFIG_KEY, 'null')
      set({ connected: false, status: 'off', message: null, parentName: null })
    },

    syncNow: async () => {
      clearTimeout(timer)
      await run()
    },
  }
})
