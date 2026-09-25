# Room Designer

A browser tool for designing wardrobes, closets and shelving: a flat 2D front view you build out of individual boards, with a cut list of everything to cut. It runs entirely in the browser: no server, no account, and your projects stay on your machine.

## Features

- Build in a front view from side, top/bottom and back panels, shelves, dividers, hanging rods and drawers. Drag to move, drag handles to resize, or type exact sizes.
- Board thickness is a project setting (body and back), and every panel follows it.
- Dimension lines for the overall size and the gaps around the selected part.
- A cut list: every board as length × width × thickness, with identical parts counted together.
- Multiple projects, autosaved in the browser. Save a project to a JSON file, or open one.
- Undo/redo and keyboard shortcuts (shown on the buttons and in the sidebar).
- Look at the unit from either side, the top or the back. These views are for looking: you edit in the front view.

## Run it locally

You need Node.js 20.19+ or 22.12+ and pnpm (`corepack enable` sets pnpm up from Node).

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

To try the production build locally: `pnpm build && pnpm preview` (http://localhost:4173).

## Self-host

The app is a plain static site. Build it and put the `dist/` folder on any static host:

```bash
pnpm install
pnpm build      # outputs dist/
```

- Any static host works: nginx, Caddy, Apache, GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket, and so on. No backend, database or environment variables are needed.
- It works at a domain root or in a sub-folder (e.g. `https://example.com/tools/room-designer/`), because all asset paths are relative.
- It must be served over `http(s)://`. Opening `dist/index.html` straight from disk (`file://`) doesn't work, because browsers block module scripts there.
- For a quick local server: `npx serve dist` or `python3 -m http.server -d dist 8080`.
- Caching: files in `dist/assets/` have content hashes in their names and can be cached forever. Serve `index.html` with `Cache-Control: no-cache` so people get updates.

## Where your data lives

Projects are stored in the browser's IndexedDB for the site's address, so:

- Each browser, and each address the app is served from (domain and port), has its own separate projects. Moving the app to a new address starts empty.
- Clearing site data in the browser deletes the projects.
- Use **Save to file** to back up a project or move it to another browser or address, and **Open file…** to bring it back.

## Stack

React 19 + Vite + TypeScript, Zustand (immer) for state, and plain SVG for the drawing. No 3D and no drawing library.

## How it works

- **Units:** everything is millimetres, all the way through. SVG user units are mm, so the drawing needs no scale conversion, only a zoom/pan `viewBox`.
- **Model** (`src/types.ts`): the design is a flat list of `Piece`s. There's no built-in cabinet: you assemble the carcass from side / top-bottom / back panels, then add shelves, dividers, rods and drawers. A piece's `x`/`y` is its bottom-left corner, `y` counts **up** from the floor, and `x = 0` is the middle of the drawing. `depth` is stored and used by the cut list, but isn't drawn in the front view. A hanging rod is round, so the inspector shows it as **length** and **diameter**.
- **Board thickness** (`src/lib/defaults.ts`): `BOARD` says which dimension of each piece kind is its thickness (side = width, shelf = height, back = depth) and which project thickness it follows. `normalizePiece` (`src/lib/geometry.ts`) applies it on every change, so a piece can't drift from the setting.
- **Coordinates** (`src/canvas/view.ts`): SVG counts y downwards and the design counts it upwards, so every flip goes through `toSvgY` / `toDesignY`. Screen→drawing conversion uses the SVG's own CTM, frozen at the start of a gesture so panning can't feed back into itself.
- **State** (`src/store/`): `useDesignStore` holds the open design and its undo history. A drag or a typed number counts as one step (`beginBatch` / `endBatch`). `useProjectsStore` holds the project list and autosaves the open design half a second after each change, or straight away when the tab is hidden or closed.
- **Saving** (`src/lib/project.ts`, `src/lib/storage.ts`): autosaves and files share one JSON format with a `formatVersion`. Everything loaded is validated and normalised, so a hand-edited or older file can't break the app. Storage sits behind a small `ProjectStorage` interface, so a cloud backend could be added later.
- **`NumberField`** is a text input, not `type="number"`: number inputs report a half-typed "-" as an empty value, which made negative X coordinates impossible to enter.

## Not done yet

A 3D preview, front-to-back positions for parts (for now every part sits flush against the back), editing in the side and top views, snapping to other panels, doors and drawer boxes, hardware lists, CSV/PDF export, and a mobile layout.
