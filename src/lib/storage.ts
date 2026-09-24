/**
 * Where projects are kept. The app only talks to this interface, so the
 * browser store below can later sit next to (or behind) a cloud backend
 * without the rest of the app changing.
 */
export type ProjectStorage = {
  /** The stored value, or null if nothing has been saved yet. */
  load: () => Promise<unknown>
  save: (data: unknown) => Promise<void>
}

const DB_NAME = 'room-designer'
const STORE = 'projects'
/** One slot for now; multiple projects will each get their own key. */
const AUTOSAVE_KEY = 'autosave'

/**
 * IndexedDB rather than localStorage: localStorage is capped at around 5 MB
 * and blocks the page on every write, and designs will grow (thumbnails,
 * materials, history).
 */
export function browserStorage(): ProjectStorage {
  let opening: Promise<IDBDatabase> | null = null
  let db: IDBDatabase | null = null
  const open = () =>
    (opening ??= openDatabase().then((opened) => {
      db = opened
      return opened
    }))

  return {
    load: async () => request((await open()).transaction(STORE).objectStore(STORE).get(AUTOSAVE_KEY)),
    save: async (data) => {
      // When the page is closing, anything that waits a tick is too late: the
      // write has to be queued and committed in the same turn as the call.
      const tx = (db ?? (await open())).transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(data, AUTOSAVE_KEY)
      tx.commit?.()
      await done(tx)
    },
  }
}

function openDatabase() {
  const opening = indexedDB.open(DB_NAME, 1)
  opening.onupgradeneeded = () => opening.result.createObjectStore(STORE)
  return request(opening)
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
