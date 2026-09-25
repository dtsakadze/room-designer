# Decisions

Architecture and design decisions, newest last, with the reason for each. Add an entry whenever an important decision is made or changed; when one is reversed, add a new entry rather than deleting the old one.

Entry format: **title** (date), then *Decision* and *Why*, and *Instead of* when alternatives were weighed.

## Product and platform

**Browser-only, local-first, open source** (2026-09-23)
*Decision*: the app runs entirely in the browser with no server. Projects live in the browser's storage and in files the user saves. It can be self-hosted as a static site.
*Why*: nothing to run or pay for, works offline, and people keep their own data. A backend with accounts and paid features may come later, so storage sits behind the `ProjectStorage` interface for a cloud version to plug in.

**Static build with relative paths** (2026-09-25)
*Decision*: `base: './'` in `vite.config.ts`.
*Why*: the same build works at a domain root or in a sub-folder (e.g. a GitHub Pages project site).

## Drawing and editing

**Design in a flat 2D front view** (2026-09-23)
*Decision*: parts are placed and resized in a 2D front view drawn with plain SVG. Other views (left, right, top, back, 3D) are for looking only; editing stays in the front view.
*Why*: wardrobes are designed mostly from the front, and 2D editing is precise and simple. An earlier 3D-first version was dropped.

**Millimetres everywhere, y up from the floor** (2026-09-23)
*Decision*: all sizes are mm; x = 0 is the middle of the drawing, y counts up from the floor. SVG's downward y is converted only in `src/canvas/view.ts`.
*Why*: matches how furniture is measured, with one place for the flip.

**Board thickness is a project setting** (2026-09-25)
*Decision*: body and back thickness are set per project; each part kind knows which of its dimensions is the thickness (`BOARD`), and `normalizePiece` applies it on every change.
*Why*: real panels come from sheets of one thickness, and changing it once updates every panel.

**No front-to-back position yet: everything sits against the back** (2026-09-25)
*Decision*: parts store no z position. `depthStart` places them flush against the back panel; the plinth sits at the front (recessed 50 mm), and front rails at the front edge.
*Why*: keeps editing 2D. Chosen over storing z (which needs a save format change) or front-flush placement. Revisit when parts need to be pulled forward (e.g. drawers flush with the front).

**Boxes own their panels** (2026-09-25)
*Decision*: a box has an outside size and a joint choice (top and bottom between or on the sides); its panels are ordinary parts tagged `boxId`, rebuilt from the box on every change. Selecting, moving, duplicating or deleting any panel acts on the whole box. "Separate panels" turns it back into loose parts.
*Why*: resizing a carcass should resize all its panels, while the cut list, views and clash check keep working on plain parts.

**Undo keeps design snapshots** (2026-09-24)
*Decision*: each design change pushes the previous pieces, boxes and thickness onto a history stack (200 steps). Drags and typing in a field are grouped into one step (`beginBatch` / `endBatch`). Selection, view and the new-part settings aren't in history.
*Why*: simple and reliable with immutable state; grouping keeps undo useful.

**Views show hidden parts** (2026-09-25)
*Decision*: in each view, the panel that covers the unit (back panel from the front or back, sides from the side, top and bottom from above) is drawn see-through and underneath the rest. Clicking a selected part again selects the one beneath it, and the Parts list reaches every part.
*Why*: otherwise covered parts couldn't be seen or selected.

**3D preview with three.js, loaded on demand** (2026-09-25)
*Decision*: a view-only 3D view using three.js, split into its own chunk that loads when the view is first opened.
*Why*: correct overlaps and smooth orbiting, without making the app slower to start. Chosen over a hand-made SVG projection.

**Selecting several parts** (2026-09-25)
*Decision*: dragging empty space pans the view. ⌘/Ctrl + drag draws a selection rectangle (it can start over a part), ⌘/Ctrl-click adds or removes one part, ⌘/Ctrl+A selects all.
*Why*: panning is the common action. An earlier version made plain drag select, and the user preferred panning.

**Colours** (2026-09-25)
*Decision*: each part can have its own colour, shown as-is on the canvas; without one it keeps the standard wood look. "Reset" removes a part's own colour. The project's "New parts" colour only applies to parts added afterwards, not existing ones. A box's panels are coloured together.
*Why*: chosen by the user over a project colour that recolours everything live. The two pickers are kept apart (the part's at the top of Selected, the new-parts one next to the add buttons) after the user mixed them up.

**Shelf-pin hole line postponed** (2026-09-25)
*Decision*: adjustable shelves move freely. Snapping to a 32 mm hole line was built and removed.
*Why*: the holes weren't visible in the front view, their positions were guessed from the floor, and nothing used them yet. Revisit with hardware and drilling plans, tied to the real side panels.

## Data and storage

**Projects in IndexedDB** (2026-09-24)
*Decision*: projects are stored in IndexedDB, not localStorage; autosave writes half a second after a change and immediately when the tab is hidden or closed, starting the write in the same turn so it survives the page closing.
*Why*: localStorage is small (~5 MB) and blocks the page on every write.

**Multiple projects** (2026-09-24)
*Decision*: one record per project, the last-open one remembered. The single design saved before projects existed is migrated to "My first project" in one transaction.
*Why*: several designs per browser, without losing earlier work.

**JSON project files** (2026-09-24)
*Decision*: "Save to file" writes the same JSON as the autosave, named after the project. "Open file…" opens it as a new project rather than replacing the open one.
*Why*: readable, easy to debug, and one format to maintain.

**Versioned save format with converters** (2026-09-25)
*Decision*: every save has a `formatVersion`; older saves are upgraded one step at a time by converters, newer ones are refused, and a project that can't be read is never opened (so autosave can't overwrite it). Details in [save-format.md](save-format.md).
*Why*: files and autosaves must keep opening after the app changes, and data must never be lost to a version mismatch.

## Engineering

**Tests with Vitest** (2026-09-25)
*Decision*: Vitest as a dev dependency (`pnpm test`), starting with fixture tests for the save format.
*Why*: correctness of old saves can't rest on one-off scripts. Replaced the earlier "no test framework" rule.

**Store selectors return existing state** (2026-09-25)
*Decision*: zustand selectors never build new arrays or objects; filter in render instead.
*Why*: a selector returning a new array on every read re-rendered forever and blanked the app.

**Ask the browser to keep the projects** (2026-09-25)
*Decision*: after the first successful autosave in a session, the app asks the browser for persistent storage (`navigator.storage.persist()`). The Project section reminds people to save a file as a backup, and warns when the browser declined.
*Why*: browsers may clear site data when disk space runs low (Safari after about a week without a visit), which would silently delete projects. Asked after a save rather than on page load because Firefox shows a permission prompt, and asking before anything's been made is pushy.

**Opening a file asks: new project or replace** (2026-09-25)
*Decision*: after a file is picked, a dialog offers "Open as a new project" (the default, nothing is lost) or "Replace <current project>", which overwrites the open project's design as one undoable step and keeps its name. Replaces the 2026-09-24 behaviour of always opening as a new project.
*Why*: warn before work is overwritten, while still allowing a file to update the project you're in.

**Copy and paste between projects** (2026-09-25)
*Decision*: ⌘/Ctrl+C copies the selected parts (whole boxes if any panel is selected); ⌘/Ctrl+V pastes them to the right of everything in the open project, keeping their layout and colours, taking that project's board thickness, as one undo step. The copy is stored in localStorage as a project save, so it survives switching projects and reloading, reaches other tabs, and is checked and upgraded on paste like a file.
*Why*: reuse parts across projects. The system clipboard wasn't used because reading it needs a browser permission prompt.

**Shortcuts panel** (2026-09-25)
*Decision*: a Shortcuts button (bottom right) lists every keyboard and mouse shortcut; buttons keep showing their own shortcut. The long sidebar hint was shortened to point to it.
*Why*: the sidebar hint was getting too long to read as shortcuts were added.

