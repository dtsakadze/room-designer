import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { productionHeaders } from '../vite.config'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

/** The headers in docker/security-headers.conf, as name → value. */
function nginxHeaders(text: string) {
  return Object.fromEntries(
    [...text.matchAll(/^add_header (\S+) "(.*)" always;$/gm)].map(([, name, value]) => [name, value]),
  )
}

describe('security headers', () => {
  const cloudflare = productionHeaders(read('public/_headers'))

  it('are the same for Cloudflare and for nginx', () => {
    expect(nginxHeaders(read('docker/security-headers.conf'))).toEqual(cloudflare)
  })

  it('allow only the app’s own scripts and no framing', () => {
    const policy = cloudflare['Content-Security-Policy']
    expect(policy).toContain("script-src 'self';")
    expect(policy).not.toMatch(/script-src[^;]*unsafe/)
    expect(policy).toContain("frame-ancestors 'none'")
    expect(cloudflare['X-Content-Type-Options']).toBe('nosniff')
  })
})
