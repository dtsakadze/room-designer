/** A project as it sits in storage. `design` is checked with `parseProject` on the way out. */
export type StoredProject = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  design: unknown
}

/**
 * Where projects are kept. The app only talks to this interface, so the
 * browser store below can later sit next to (or behind) a cloud backend
 * without the rest of the app changing.
 */
export type ProjectStorage = {
  list: () => Promise<StoredProject[]>
  get: (id: string) => Promise<StoredProject | undefined>
  put: (project: StoredProject) => Promise<void>
  remove: (id: string) => Promise<void>
  /** The project that was open last, so a reload comes back to it. */
  getCurrentId: () => Promise<string | null>
  setCurrentId: (id: string) => Promise<void>
  /**
   * Turns the single design saved before there were projects into a project.
   * The new project and the removal of the old save happen in one transaction,
   * so a failure can't lose it. An old save `convert` can't read is left alone.
   */
  migrateLegacyDesign: (convert: (legacy: unknown) => StoredProject | null) => Promise<void>
}

const DB_NAME = 'room-designer'
const DB_VERSION = 2
const PROJECTS = 'projects'
const META = 'meta'
const CURRENT_ID = 'currentId'
/** Version 1 kept its one design in the projects store under this key. */
const LEGACY_KEY = 'autosave'

/**
 * IndexedDB rather than localStorage: localStorage is capped at around 5 MB
 * and blocks the page on every write, and designs will grow (thumbnails,
 * materials, history).
 */
export function browserStorage(options: { onBlocked?: () => void } = {}): ProjectStorage {
  let opening: Promise<IDBDatabase> | null = null
  let db: IDBDatabase | null = null
  const open = () =>
    (opening ??= openDatabase(options.onBlocked).then((opened) => {
      db = opened
      return opened
    }))

  const read = async <T>(store: string, run: (store: IDBObjectStore) => IDBRequest<T>) =>
    request(run((await open()).transaction(store).objectStore(store)))

  /**
   * When the page is closing, anything that waits a tick is too late, so once
   * the database is open a write is queued and committed in the same turn.
   */
  const write = async (store: string, run: (store: IDBObjectStore) => void) => {
    const tx = (db ?? (await open())).transaction(store, 'readwrite')
    run(tx.objectStore(store))
    tx.commit?.()
    await done(tx)
  }

  return {
    list: async () => {
      const all = await read(PROJECTS, (store) => store.getAll())
      return all.filter(isStoredProject)
    },
    get: async (id) => {
      const found = await read(PROJECTS, (store) => store.get(id))
      return isStoredProject(found) ? found : undefined
    },
    put: (project) => write(PROJECTS, (store) => store.put(project, project.id)),
    remove: (id) => write(PROJECTS, (store) => store.delete(id)),
    getCurrentId: async () => {
      const id = await read(META, (store) => store.get(CURRENT_ID))
      return typeof id === 'string' ? id : null
    },
    setCurrentId: (id) => write(META, (store) => store.put(id, CURRENT_ID)),
    migrateLegacyDesign: async (convert) => {
      const legacy = await read(PROJECTS, (store) => store.get(LEGACY_KEY))
      if (legacy === undefined) return
      const project = convert(legacy)
      if (!project) return
      await write(PROJECTS, (store) => {
        store.put(project, project.id)
        store.delete(LEGACY_KEY)
      })
    },
  }
}

/**
 * An upgrade to a new database version waits until every open connection to
 * the old one is closed. So each connection closes itself when a newer version
 * asks, and if a tab running older code still holds on, `onBlocked` lets the
 * app say so. The open still completes by itself once that tab goes away.
 */
async function openDatabase(onBlocked?: () => void) {
  const opening = indexedDB.open(DB_NAME, DB_VERSION)
  opening.onupgradeneeded = () => {
    const db = opening.result
    if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS)
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META)
  }
  opening.onblocked = () => onBlocked?.()
  const db = await request(opening)
  db.onversionchange = () => db.close()
  return db
}

const isStoredProject = (value: unknown): value is StoredProject => {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return ['id', 'name', 'createdAt', 'updatedAt'].every((key) => typeof record[key] === 'string')
}

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/**
 * Asks the browser to keep this site's data instead of clearing it when disk
 * space runs low (or, in Safari, after a week without a visit). Returns
 * whether the data is protected; false where the browser declines or can't say.
 * Chrome decides silently; Firefox asks the user, so call it after they've
 * made something worth keeping rather than on page load.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
