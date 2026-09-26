# Boardcut — agent notes

Browser app for designing wardrobes, closets and shelving in a flat 2D front view. Open source, runs fully in the browser with no server (a backend may come later). `README.md` explains how the app works; `notes.md` is the roadmap; `docs/` holds the design decisions (`docs/decisions.md`), the save format guide (`docs/save-format.md`) and how to release (`docs/releasing.md`). `CHANGELOG.md` lists what changed per version and is shown in the app.

## Commands

- `pnpm dev`: dev server on http://localhost:5173 (the user usually has it running already)
- `pnpm build`: `tsc -b` + Vite build, which is the type check
- `pnpm lint`: oxlint
- `pnpm test`: Vitest (`src/**/*.test.ts`)

Run `pnpm build`, `pnpm lint` and `pnpm test` after every change.

## Layout

- `src/types.ts`: `Piece` (one board or fitting), `Box` (a carcass sized as one) and `Thickness`
- `src/lib/`: pure logic. `defaults.ts` (piece sizes, `BOARD` map), `geometry.ts` (`normalizePiece`, `neighbourGaps`, `depthStart`, `findClashes`), `cutList.ts`, `project.ts` (saved format), `projectFile.ts` (JSON import/export), `storage.ts` (IndexedDB), `box.ts` (a box's panels)
- `src/store/`: `useDesignStore` (the open design, undo/redo) and `useProjectsStore` (project list, switching, autosave)
- `src/canvas/`: the SVG drawing. `view.ts` owns every conversion between design and SVG coordinates. `views.ts` projects pieces for the left, right, top and back views, which are read-only; only the front view edits. `Preview3D.tsx` is the three.js preview, lazy-loaded so three.js stays out of the main bundle.
- `src/ui/`: `Sidebar.tsx` (project header and foldable sections: Add, Parts, Settings, File; add a new one with `CollapsibleSection`), `Inspector.tsx` (the Selected panel right of the canvas), dialogs and panels, `shortcuts.ts`

## Rules

- **Units are mm everywhere in code and saves.** Design y counts up from the floor and x = 0 is the middle. SVG y counts down, so convert only through `toSvgY` / `toDesignY`. The Units setting (mm, cm, m, in) is display only: show lengths with `useUnits()` (`len` / `num`) and take typed lengths through `NumberField`, never raw mm numbers in the UI.
- **Board thickness belongs to the project, not the piece.** `BOARD` says which dimension of each kind is its thickness, and `normalizePiece` resets it from `state.thickness` on every write. Never make thickness editable per piece. Rods and drawers aren't boards.
- **Boxes own their panels.** A box's sides, top, bottom and back are ordinary pieces tagged `boxId`, always rebuilt from the box (`rebuildBox`), never edited one by one; moving, duplicating or deleting one of them acts on the whole box.
- **Pieces have no front-to-back position (z) yet.** `depthStart` places every piece flush against the back panel (plinth and front rails excepted); the side, top and 3D views and the clash check all use it. Adding z means a `FORMAT_VERSION` bump.
- **Every design change goes through a store action** that calls `record(state)` for undo, and skips no-op changes so undo never does nothing. Group continuous edits (drags, typing in a field) with `beginBatch` / `endBatch`. Selection and view are not in history or saves.
- **Browser storage names keep the old `room-designer` prefix** (the IndexedDB name and every localStorage key). Renaming one loses what people have stored; new keys use the same prefix.
- **Storage goes through the `ProjectStorage` interface** so a cloud backend can plug in later. Changing the IndexedDB schema means bumping `DB_VERSION`, handling it in `onupgradeneeded`, and migrating data in one transaction. Writes must start in the same turn as the call, otherwise saves made while the page closes are lost.
- **Shortcuts:** ⌘ on Mac, Ctrl elsewhere (`hasModifier`). Labels live in `ui/shortcuts.ts`; every shortcut is shown on its button (if it has one) and listed in the Shortcuts panel (`ui/ShortcutsPanel.tsx`). Key handlers ignore events from text inputs.
- **Store selectors must not build new arrays or objects** (`s.pieces.filter(...)` inside `useDesignStore(...)`): zustand then sees a change on every read and React re-renders forever, blanking the app. Select the raw state and filter in render.
- **React keys must be unique even when values repeat.** Two dimension lines can share from/to, and colliding keys left stale lines on the canvas.
- On-canvas strokes and text are sized with `unit` (`view.w / 1400`) so they stay the same size on screen at any zoom.
- Code style: no semicolons, single quotes, 2-space indent. Comments explain why, not what. Match the surrounding code. In Markdown, don't hard-wrap lines: one line per paragraph or list item, and let the editor wrap.
- **Record every architectural, design or otherwise important decision or change in `docs/decisions.md`** (what, when, why, and what it replaced), in the same change that makes it. Reversing one gets a new entry, not a deletion.
- **Every new feature, bug fix, improvement or removal that people using the app would notice adds a line under `## Unreleased` in `CHANGELOG.md`, in the same change.** Write it for them, not for developers (the app shows it as "What's new"). Internal-only changes (refactors, tests, docs) don't need a line. On release, `pnpm release <patch|minor|major>` turns "Unreleased" into the new version; don't edit version numbers or dates by hand, and don't release, tag or push unless asked. See `docs/releasing.md`.
- Keep `notes.md` in sync when roadmap items are done or change. Don't commit unless asked; the user commits.

## Save format (read `docs/save-format.md` before touching it)

Projects are saved as `ProjectData` JSON (`src/lib/project.ts`) in the browser (autosave) and in files people keep for years, so every version ever released must keep opening.

- Every save has `formatVersion`. Everything that loads a save goes through `readProject` (or `parseProject`): older versions are upgraded one step at a time by the converters in `MIGRATIONS` (step N turns version N into N + 1), newer versions are refused as `newer`, anything else broken is `invalid`. Nothing loaded is trusted: `validate` drops and normalises bad data.
- A project that can't be read is never opened (it's marked "Can't open" in the list), so autosave can never overwrite it. Keep it that way.
- Any change to what's saved (new required field, rename, removal, changed meaning or units) needs a new version. An optional field whose absence means the old behaviour may not, but then `validate` must default it. When in doubt, bump.
- To change the format, in order: save a sample of the current version to `src/lib/fixtures/v<N>-<name>.json` first; bump `FORMAT_VERSION` and the `ProjectData` type; add converter `N` to `MIGRATIONS`; update `validate` and `toProjectData`; add tests in `project.test.ts`; save a sample of the new version; add a row to the version history in `docs/save-format.md` and an entry in `docs/decisions.md`.
- Converters are frozen once released: never edit or delete one, or a sample. Fix mistakes with a new version. Converters are one step, pure (no clock, storage or app state), don't mutate their input, work on raw JSON rather than app types, and tolerate missing or wrong-typed fields.
- `DB_VERSION` (`src/lib/storage.ts`) is separate: it versions the browser database's layout, not the project JSON. See the end of `docs/save-format.md`.

## Checking changes

- **Store and lib logic:** add a Vitest test for anything lasting (the save format has fixture tests). For a one-off check, load the module through Vite in a scratch script: `createServer({ server: { middlewareMode: true } })`, then `server.ssrLoadModule('/src/store/useDesignStore.ts')`. Import Vite from `node_modules/vite/dist/node/index.js` when the script lives outside the repo.
- **In the browser:** the user's real projects live in IndexedDB on localhost:5173. Back them up before anything destructive, test with undo or throwaway projects, and leave their data as it was.
- **Browser-test pitfalls:**
  - Automation tabs count as hidden, so timers are throttled and "Saving…" can linger for seconds.
  - Synthetic clicks right after a page load sometimes don't register; a DOM `.click()` from JS is reliable.
  - Intercept `HTMLAnchorElement.prototype.click` so tests don't download real files to the user's machine.
- **Vite hot reload** can keep an old module's IndexedDB connection open in the same page, which blocks a `DB_VERSION` upgrade. A full reload fixes it.
