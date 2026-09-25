import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The app shows its own version, read from package.json at build time.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  // Relative asset paths, so the build works from any folder on any host (e.g.
  // a GitHub Pages project site under /room-designer/), not just a domain root.
  base: './',
  build: {
    // three.js alone is ~560 kB (140 kB gzipped). It's split into its own chunk
    // that only loads when the 3D preview opens, so the warning isn't useful.
    chunkSizeWarningLimit: 700,
  },
})
