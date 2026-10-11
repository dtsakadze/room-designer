import { describe, expect, it } from 'vitest'
import file from '../public/_headers?raw'

/** The headers public/_headers sends: its indented `Name: value` lines. */
const headers = Object.fromEntries(
  [...file.matchAll(/^\s+([\w-]+): (.*)$/gm)].map(([, name, value]) => [name, value]),
)

describe('security headers', () => {
  it('allow only the app’s own scripts and no framing', () => {
    const policy = headers['Content-Security-Policy']
    expect(policy).toContain("script-src 'self';")
    expect(policy).not.toMatch(/script-src[^;]*unsafe/)
    expect(policy).toContain("frame-ancestors 'none'")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })
})
