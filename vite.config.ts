import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

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

// robots.txt always; sitemap.xml only with a site address
function seoFiles(siteUrl: string | null): Record<string, string> {
  const robots = ['User-agent: *', 'Allow: /']
  if (!siteUrl) return { 'robots.txt': robots.join('\n') + '\n' }
  robots.push('', `Sitemap: ${siteUrl}sitemap.xml`)
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${siteUrl}</loc></url>`,
    '</urlset>',
  ]
  return { 'robots.txt': robots.join('\n') + '\n', 'sitemap.xml': sitemap.join('\n') + '\n' }
}

function seo(siteUrl: string | null): Plugin {
  const files = seoFiles(siteUrl)
  return {
    name: 'seo',
    transformIndexHtml() {
      if (!siteUrl) return []
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: siteUrl }, injectTo: 'head' },
      ]
    },
    // The dev server would answer these paths with the app page otherwise.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].slice(1) ?? ''
        if (!Object.hasOwn(files, name)) return next()
        res.setHeader('Content-Type', name.endsWith('.xml') ? 'application/xml' : 'text/plain')
        res.end(files[name])
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), seo(readSiteUrl(loadEnv(mode, process.cwd(), '').SITE_URL))],
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Relative asset paths, so the build works from any folder on any host
  base: './',
  build: { chunkSizeWarningLimit: 700 },
}))
