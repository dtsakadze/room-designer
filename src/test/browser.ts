import { vi } from 'vitest'

/**
 * Stand-ins for the browser APIs the app touches, for tests running in Node.
 * Each call gives a fresh, empty one; `vi.unstubAllGlobals()` removes them.
 */

/** An in-memory `localStorage`. */
export function stubLocalStorage() {
  const items = new Map<string, string>()
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  }
  vi.stubGlobal('localStorage', storage)
  return items
}

/**
 * `window` and `document` event targets that only record their listeners, so
 * a test can fire `visibilitychange` or `pagehide` itself.
 */
export function stubPageEvents() {
  const listeners = new Map<string, (() => void)[]>()
  const target = {
    addEventListener: (type: string, listener: () => void) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: () => {},
  }
  const document = { ...target, visibilityState: 'visible' }
  vi.stubGlobal('window', target)
  vi.stubGlobal('document', document)
  return {
    fire: (type: string) => listeners.get(type)?.forEach((listener) => listener()),
    hide: () => {
      document.visibilityState = 'hidden'
      listeners.get('visibilitychange')?.forEach((listener) => listener())
    },
  }
}
