import { describe, expect, it, vi } from 'vitest'
import { serviceWorkerSource } from './serviceWorker'

const FILES = ['./', 'manifest.webmanifest', 'assets/app-abc.js', 'assets/lazy-def.js']
const ORIGIN = 'https://example.com'
const LOCATION = new URL(`${ORIGIN}/tools/boardcut/sw.js`)
const PAGE = `${ORIGIN}/tools/boardcut/`

type Handler = (event: Record<string, unknown>) => void

/** The worker's source run against an in-memory cache and a scripted network. */
function worker(builtAt: number, existing: Record<string, string[]> = {}) {
  const stored = new Map<string, Map<string, string>>(
    Object.entries(existing).map(([name, urls]) => [name, new Map(urls.map((url) => [url, 'old']))]),
  )
  // The server sends `Vary: Origin`, so a saved file only matches a request that also has no Origin header, unless Vary is ignored.
  const varies = (request: string | { url: string; origin?: boolean }, ignoreVary?: boolean) =>
    !ignoreVary && typeof request !== 'string' && !!request.origin
  const key = (request: string | { url: string }, ignoreSearch = false) => {
    const url = new URL(typeof request === 'string' ? request : request.url, LOCATION)
    if (ignoreSearch) url.search = ''
    return url.href
  }
  const cache = (name: string) => ({
    addAll: async (urls: string[]) => {
      for (const url of urls) stored.get(name)!.set(key(url), await network(key(url)))
    },
    put: async (request: string, response: unknown) => void stored.get(name)!.set(key(request), response as string),
    match: async (request: string, options?: { ignoreSearch?: boolean; ignoreVary?: boolean }) =>
      varies(request, options?.ignoreVary) ? undefined : stored.get(name)!.get(key(request, options?.ignoreSearch)),
  })
  const caches = {
    open: async (name: string) => {
      if (!stored.has(name)) stored.set(name, new Map())
      return cache(name)
    },
    keys: async () => [...stored.keys()],
    delete: async (name: string) => stored.delete(name),
    match: async (request: string | { url: string }, options?: { ignoreSearch?: boolean; ignoreVary?: boolean }) => {
      if (varies(request, options?.ignoreVary)) return undefined
      for (const files of stored.values()) {
        const hit = files.get(key(request, options?.ignoreSearch))
        if (hit !== undefined) return hit
      }
      return undefined
    },
  }
  let online = true
  const network = vi.fn(async (url: string) => {
    if (!online) throw new Error('offline')
    return { ok: true, clone: () => `network ${url}`, toString: () => `network ${url}` } as unknown as string
  })
  const listeners: Record<string, Handler> = {}
  const self = {
    location: LOCATION,
    addEventListener: (type: string, handler: Handler) => (listeners[type] = handler),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }
  new Function('self', 'caches', 'fetch', serviceWorkerSource(FILES, builtAt))(
    self,
    caches,
    (request: string | { url: string }) => network(key(request)),
  )

  const run = async (type: string, event: Record<string, unknown> = {}) => {
    let waited: Promise<unknown> = Promise.resolve()
    let responded: Promise<unknown> | null = null
    listeners[type]({
      ...event,
      waitUntil: (promise: Promise<unknown>) => (waited = promise),
      respondWith: (promise: Promise<unknown>) => (responded = promise),
    })
    await waited
    return responded ? await responded : null
  }
  const request = (url: string, extra: Record<string, unknown> = {}) => ({
    request: { method: 'GET', url, mode: 'cors', ...extra },
  })
  return { stored, network, self, run, request, setOnline: (value: boolean) => (online = value) }
}

describe('service worker', () => {
  it('is valid JavaScript with its cache named for the build', () => {
    const source = serviceWorkerSource(FILES, 1700000000000)
    expect(() => new Function('self', 'caches', 'fetch', source)).not.toThrow()
    expect(source).toContain('"boardcut-1700000000000"')
    expect(source).toContain('"assets/lazy-def.js"')
  })

  it('saves every file when installed, and takes over at once', async () => {
    const w = worker(2000)
    await w.run('install')
    const files = [...w.stored.get('boardcut-2000')!.keys()]
    expect(files).toEqual([PAGE, `${PAGE}manifest.webmanifest`, `${PAGE}assets/app-abc.js`, `${PAGE}assets/lazy-def.js`])
    expect(w.self.skipWaiting).toHaveBeenCalled()
  })

  it('keeps only the newest two caches when activated, and ignores other sites’ caches', async () => {
    const w = worker(3000, { 'boardcut-1000': [], 'boardcut-2000': [], 'boardcut-3000': [], 'other-cache': [] })
    await w.run('activate')
    expect([...w.stored.keys()].sort()).toEqual(['boardcut-2000', 'boardcut-3000', 'other-cache'])
    expect(w.self.clients.claim).toHaveBeenCalled()
  })

  it('serves saved files without the network, and fetches what it hasn’t saved', async () => {
    const w = worker(2000)
    await w.run('install')
    w.network.mockClear()
    expect(String(await w.run('fetch', w.request(`${PAGE}assets/app-abc.js`)))).toContain('assets/app-abc.js')
    expect(w.network).not.toHaveBeenCalled()
    await w.run('fetch', w.request(`${PAGE}something-else.png`))
    expect(w.network).toHaveBeenCalledWith(`${PAGE}something-else.png`)
  })

  it('finds saved files for requests that carry an Origin header, as Chrome sends for scripts and styles', async () => {
    const w = worker(2000)
    await w.run('install')
    w.setOnline(false)
    expect(String(await w.run('fetch', w.request(`${PAGE}assets/app-abc.js`, { origin: true })))).toContain('assets/app-abc.js')
  })

  it('leaves other requests alone: not GET, or another site', async () => {
    const w = worker(2000)
    expect(await w.run('fetch', w.request(PAGE, { method: 'POST' }))).toBeNull()
    expect(await w.run('fetch', w.request('https://elsewhere.com/x.js'))).toBeNull()
  })

  it('opens the page from the network when online, and from the saved page offline', async () => {
    const w = worker(2000)
    await w.run('install')
    w.setOnline(true)
    expect(String(await w.run('fetch', w.request(PAGE, { mode: 'navigate' })))).toBe(`network ${PAGE}`)
    w.setOnline(false)
    expect(String(await w.run('fetch', w.request(PAGE, { mode: 'navigate' })))).toBe(`network ${PAGE}`)
    // With a search in the address too.
    expect(await w.run('fetch', w.request(`${PAGE}?utm=1`, { mode: 'navigate' }))).toBeDefined()
  })

  it('never overwrites a saved page with a network one, so it always matches its own files', async () => {
    const w = worker(2000)
    await w.run('install')
    const saved = w.stored.get('boardcut-2000')!.get(PAGE)
    w.network.mockImplementation(async (url: string) => ({ ok: true, clone: () => 'NEW PAGE', toString: () => `new ${url}` }) as never)
    await w.run('fetch', w.request(PAGE, { mode: 'navigate' }))
    expect(w.stored.get('boardcut-2000')!.get(PAGE)).toBe(saved)
  })

  it('opens the newest saved page offline, not an older version’s', async () => {
    const w = worker(3000, { 'boardcut-1000': [`${PAGE}`], 'boardcut-3000': [] })
    w.stored.get('boardcut-1000')!.set(PAGE, 'old page')
    await w.run('install')
    w.setOnline(false)
    expect(String(await w.run('fetch', w.request(PAGE, { mode: 'navigate' })))).toBe(`network ${PAGE}`)
    // Remove the newest copy and it falls back to the older one.
    w.stored.get('boardcut-3000')!.delete(PAGE)
    expect(await w.run('fetch', w.request(PAGE, { mode: 'navigate' }))).toBe('old page')
  })
})
