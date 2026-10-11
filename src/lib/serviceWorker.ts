/**
 * The source of the app's service worker, which saves the built app on the
 * device so it opens offline and can be installed. It is written out at build
 * time (see `vite.config.ts`) with the list of files to save, and the cache
 * name carries the build time, so every build is a new cache.
 *
 * - Pages are fetched from the network first, so a new version arrives as soon
 *   as there is signal. Offline, the page saved by the newest install is used:
 *   it is never overwritten, so it always matches the files saved with it.
 * - Everything else comes from the saved files first (the files in `assets/`
 *   have the hash of their contents in their names, so they never go stale).
 *   `ignoreVary` matters: servers send `Vary: Origin`, and Chrome asks for the
 *   page's scripts and styles with an Origin header that the saved requests
 *   lack, so without it a saved file is not found and the app stays blank.
 * - The newest two caches are kept: a page still open on the old version can
 *   then load its lazy files (such as the 3D view) after an update.
 *
 * Plain JavaScript in a string: it runs in the worker, not in the app.
 */
export function serviceWorkerSource(files: string[], builtAt: number): string {
  return `const CACHE = ${JSON.stringify(`boardcut-${builtAt}`)}
const FILES = ${JSON.stringify(files)}
// The app's page, wherever it's served from.
const INDEX = new URL('./', self.location).href

// The page saved by the newest install. Looked up cache by cache, newest first:
// a plain caches.match would search the oldest first, and give the page of an
// old version.
function newestPage() {
  return caches.keys().then((names) =>
    names
      .filter((name) => name.startsWith('boardcut-'))
      .sort()
      .reverse()
      .reduce(
        (found, name) =>
          found.then((page) => page || caches.open(name).then((cache) => cache.match(INDEX, { ignoreSearch: true, ignoreVary: true }))),
        Promise.resolve(undefined),
      ),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => {
        const ours = names.filter((name) => name.startsWith('boardcut-')).sort().reverse()
        return Promise.all(ours.slice(2).map((name) => caches.delete(name)))
      })
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => newestPage()),
    )
    return
  }
  // This version's own copy first: a plain caches.match searches the oldest
  // cache first, which for the files whose names don't change between builds
  // (icons, the manifest) would give the previous version's.
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(request, { ignoreVary: true }))
      .then((own) => own || caches.match(request, { ignoreVary: true }))
      .then((saved) => saved || fetch(request)),
  )
})
`
}
