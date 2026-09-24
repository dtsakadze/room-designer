# Room Designer — agent notes

Browser app for designing wardrobes, closets and shelving in a flat 2D front view. Open source, runs fully in the browser with no server (a backend may come later). `README.md` explains how the app works; `notes.md` is the roadmap.

## Commands

- `pnpm dev`: dev server on http://localhost:5173 (the user usually has it running already)
- `pnpm build`: `tsc -b` + Vite build, which is the type check
- `pnpm lint`: oxlint

No test runner yet. Run `pnpm build` and `pnpm lint` after every change.

## Layout

- `src/types.ts`: `Piece` (one board or fitting) and `Thickness`
- `src/lib/`: pure logic. `defaults.ts` (piece sizes, `BOARD` map), `geometry.ts` (`normalizePiece`, `neighbourGaps`), `cutList.ts`, `project.ts` (saved format), `projectFile.ts` (JSON import/export), `storage.ts` (IndexedDB)
- `src/store/`: `useDesignStore` (the open design, undo/redo) and `useProjectsStore` (project list, switching, autosave)
- `src/canvas/`: the SVG drawing. `view.ts` owns every conversion between design and SVG coordinates.
- `src/ui/`: sidebar, panels, `shortcuts.ts`

## Rules

- **Units are mm everywhere.** Design y counts up from the floor and x = 0 is the middle. SVG y counts down, so convert only through `toSvgY` / `toDesignY`.
- **Board thickness belongs to the project, not the piece.** `BOARD` says which dimension of each kind is its thickness, and `normalizePiece` resets it from `state.thickness` on every write. Never make thickness editable per piece. Rods and drawers aren't boards.
- **Every design change goes through a store action** that calls `record(state)` for undo, and skips no-op changes so undo never does nothing. Group continuous edits (drags, typing in a field) with `beginBatch` / `endBatch`. Selection and view are not in history or saves.
- **Saved data is untrusted.** Autosaves and files are `ProjectData` with `formatVersion`, and everything loaded goes through `parseProject`. If the shape changes, bump `FORMAT_VERSION` and teach `parseProject` to upgrade the old version.
- **Storage goes through the `ProjectStorage` interface** so a cloud backend can plug in later. Changing the IndexedDB schema means bumping `DB_VERSION`, handling it in `onupgradeneeded`, and migrating data in one transaction. Writes must start in the same turn as the call, otherwise saves made while the page closes are lost.
- **Shortcuts:** ⌘ on Mac, Ctrl elsewhere (`hasModifier`). Labels live in `ui/shortcuts.ts`, and every shortcut is shown on its button and in the sidebar hint. Key handlers ignore events from text inputs.
- **React keys must be unique even when values repeat.** Two dimension lines can share from/to, and colliding keys left stale lines on the canvas.
- On-canvas strokes and text are sized with `unit` (`view.w / 1400`) so they stay the same size on screen at any zoom.
- Code style: no semicolons, single quotes, 2-space indent. Comments explain why, not what. Match the surrounding code. In Markdown, don't hard-wrap lines: one line per paragraph or list item, and let the editor wrap.
- Keep `notes.md` in sync when roadmap items are done or change. Don't commit unless asked; the user commits.

## Checking changes

- **Store and lib logic:** load the module through Vite in a scratch script instead of adding a test framework: `createServer({ server: { middlewareMode: true } })`, then `server.ssrLoadModule('/src/store/useDesignStore.ts')`. Import Vite from `node_modules/vite/dist/node/index.js` when the script lives outside the repo.
- **In the browser:** the user's real projects live in IndexedDB on localhost:5173. Back them up before anything destructive, test with undo or throwaway projects, and leave their data as it was.
- **Browser-test pitfalls:**
  - Automation tabs count as hidden, so timers are throttled and "Saving…" can linger for seconds.
  - Synthetic clicks right after a page load sometimes don't register; a DOM `.click()` from JS is reliable.
  - Intercept `HTMLAnchorElement.prototype.click` so tests don't download real files to the user's machine.
- **Vite hot reload** can keep an old module's IndexedDB connection open in the same page, which blocks a `DB_VERSION` upgrade. A full reload fixes it.
