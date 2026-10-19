import { describe, expect, it } from 'vitest'
import file from '../public/_headers?raw'

/** The headers public/_headers sends: its indented `Name: value` lines. */
const headers = Object.fromEntries(
  [...file.matchAll(/^\s+([\w-]+): (.*)$/gm)].map(([, name, value]) => [name, value]),
)

describe('security headers', () => {
  it('allow only the app’s own scripts, and Google’s for Drive sync, and no framing', () => {
    const policy = headers['Content-Security-Policy']
    const scripts = /script-src ([^;]*);/.exec(policy)![1].split(' ')
    expect(scripts[0]).toBe("'self'")
    expect(scripts.slice(1).every((source) => /^https:\/\/(accounts\.google\.com\/gsi\/client|apis\.google\.com|www\.gstatic\.com)$/.test(source))).toBe(true)
    expect(policy).not.toMatch(/script-src[^;]*unsafe/)
    expect(policy).toContain("frame-ancestors 'none'")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })
})
