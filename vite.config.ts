/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { serviceWorkerSource } from './src/lib/serviceWorker.ts'

// The app shows its own version, read from package.json at build time.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// The address the official copy is served from, e.g. SITE_URL=https://example.app
// (from the environment or .env). Without it (self-hosted copies, local builds)
// the build leaves out everything that needs a full URL, so a copy never points
// search engines at another site.
function readSiteUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const url = URL.canParse(value.trim()) ? new URL(value.trim()) : null
  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`SITE_URL must be a full address like https://example.app, got "${value}"`)
  }
  return url.href.replace(/\/*$/, '/')
}

// The canonical link and og:url, when the build knows its site address.
function seo(siteUrl: string | null): Plugin {
  return {
    name: 'seo',
    transformIndexHtml() {
      if (!siteUrl) return []
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: siteUrl }, injectTo: 'head' },
      ]
    },
  }
}

// Writes the service worker that lets the app open offline and be installed,
// with every file of the build for it to save. Not in the dev server, where
// the files change all the time.
function pwa(): Plugin {
  return {
    name: 'pwa',
    apply: 'build',
    generateBundle(_, bundle) {
      const own = ['./', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']
      const built = Object.keys(bundle).filter((name) => name !== 'index.html' && !name.endsWith('.map'))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource([...own, ...built], Date.now()) })
    },
  }
}

/**
 * The headers in public/_headers (Cloudflare's format) for every path, so
 * `pnpm preview` serves the build as production does and a Content Security
 * Policy that breaks something shows up before it's deployed. Not in the dev
 * server, whose hot reload needs inline scripts the policy forbids.
 */
export function productionHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {}
  let inAll = false
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      inAll = line.trim() === '/*'
      continue
    }
    const colon = line.indexOf(':')
    if (inAll && colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return headers
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), pwa(), seo(readSiteUrl(loadEnv(mode, process.cwd(), '').SITE_URL))],
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Relative asset paths, so the build works from any folder on any host
  base: './',
  build: { chunkSizeWarningLimit: 700 },
  preview: { headers: productionHeaders(readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')) },
}))
