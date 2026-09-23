# room-designer

A minimal browser tool for designing wardrobes, closets and shelving in 3D.

```bash
pnpm install
pnpm dev
```

## Stack

React 19 + Vite + TypeScript, Three.js via React Three Fiber / drei, Zustand (immer) for state.

## How it works

- **Units:** the store is in millimetres, the scene is in metres. `src/lib/units.ts` holds the
  conversion and it is applied only at the R3F boundary.
- **Model** (`src/types.ts`): one `Cabinet` (outer W×H×D + panel thickness + optional back) owning
  a list of `Part`s (`shelf`, `divider`, `rod`, `drawer`). A part's `x/y/z` is its min corner inside
  the cavity, measured from the inner bottom-left-back corner.
- **Geometry** (`src/lib/geometry.ts`): `innerSize`, `cavityOrigin`, `partToWorld` and `clampPart`
  are the single source of truth for the coordinate convention. Every mutation runs through
  `clampPart`, so the numeric inputs and the 3D drag can never disagree.
- **Interaction:** sidebar buttons add a part; clicking selects; dragging a part moves it across the
  horizontal plane it sits on (`src/scene/useDragOnFloor.ts`, which disables OrbitControls while
  dragging). Height is edited numerically in the inspector.

## Not done yet

Persistence, undo/redo, multiple cabinets, doors, materials, dimension lines, cut list / export,
mobile layout.
