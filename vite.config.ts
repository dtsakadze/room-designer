import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any folder on any host (e.g.
  // a GitHub Pages project site under /room-designer/), not just a domain root.
  base: './',
})
