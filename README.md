# room-designer

A minimal browser tool for designing wardrobes, closets and shelving — a flat 2D elevation you
assemble out of individual boards.

```bash
pnpm install
pnpm dev
```

## Stack

React 19 + Vite + TypeScript, Zustand (immer) for state, and plain SVG for the drawing. No 3D and no
drawing library.

## How it works

- **Units:** everything is millimetres, all the way through. SVG user units are mm, so the drawing
  needs no scale conversion — only a zoom/pan `viewBox`.
- **Model** (`src/types.ts`): the design is a flat list of `Piece`s. There is no built-in cabinet —
  you assemble the carcass yourself from side / top-bottom / back panels, then add shelves,
  dividers, rods and drawers. A piece's `x`/`y` is its bottom-left corner, `y` counts **up** from the
  floor and `x = 0` is the middle of the drawing. `depth` is stored (for a cut list later) but is not
  drawn in an elevation view.
- **Coordinates** (`src/canvas/view.ts`): SVG counts y downwards and the design counts it upwards,
  so every flip goes through `toSvgY` / `toDesignY`. Screen→drawing conversion uses the SVG's own
  CTM, frozen at the start of a gesture so panning can't feed back into itself.
- **Geometry** (`src/lib/geometry.ts`): `normalizePiece` (sane sizes, nothing below the floor) and
  `contentBounds` are the single source of truth; the store runs every mutation through them.
- **Interaction** (`src/canvas/Canvas2D.tsx`): sidebar components add a piece, dropped on the floor
  clear of what is already there. Click to select, drag to move (snapped to 10mm), drag the
  background to pan, wheel to zoom around the cursor, "Fit view" to frame everything. Arrow keys
  nudge by 10mm (100mm with shift) and Delete removes. The inspector edits exact sizes and
  positions, and has Duplicate / Delete.
- **`NumberField`** is a text input, not `type="number"`: number inputs report a half-typed "-" as an
  empty value, which made negative X coordinates impossible to enter.

## Not done yet

Persistence, undo/redo, snapping pieces to each other's edges, grouping, multiple views (plan /
side), doors, dimension lines, cut list / export, mobile layout.
