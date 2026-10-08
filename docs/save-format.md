# Save format and versions

How projects are saved, and how to change what's saved without breaking projects people already have. Read this before changing anything that ends up in a save.

## What gets saved

A project's design is saved as `ProjectData` (`src/lib/project.ts`): plain JSON with a `formatVersion` number, the board thicknesses and names, unit depth, the list of parts (`pieces`), boxes, the colour for new parts, and the room (which walls are used and its size). Selection, the view and undo history are not saved.

The same JSON is used in two places:

- **Autosave**: every project in the browser's IndexedDB (`src/lib/storage.ts`), saved half a second after each change.
- **Files**: "Save to file" downloads it as `.json`; "Open file…" reads one back as a new project.

Files leave the app. People keep them, email them, and open them months later in a newer (or older) version of the app. So every version of the format that was ever released has to keep opening.

## Two different version numbers

Don't mix these up:

| Number | Where | What it versions | When to bump |
|---|---|---|---|
| `FORMAT_VERSION` | `src/lib/project.ts` | The shape of a project's JSON (autosaves and files) | A saved field is added, removed, renamed, or changes meaning |
| `DB_VERSION` | `src/lib/storage.ts` | The browser database's layout (its object stores) | A store is added or removed, or records move between stores |

This page is mostly about `FORMAT_VERSION`. `DB_VERSION` is covered at the end.

## How loading works

Everything that loads a project goes through `readProject(data)` in `src/lib/project.ts`. It returns either the project, or a reason it can't be opened:

1. **Not a project** (not an object, or no whole-number `formatVersion` of at least 1): refused as `invalid`.
2. **Newer than this app** (`formatVersion > FORMAT_VERSION`): refused as `newer`. The app never guesses at a format it doesn't know.
3. **Older than this app**: upgraded one step at a time with the converters in `MIGRATIONS`. A version 2 save opened by a version 4 app runs 2→3, then 3→4.
4. **Checked** (`validate`): nothing in a save is trusted, since it may be hand-edited or damaged. Unknown or broken parts are dropped, every part goes through `normalizePiece`, and a box's panels are rebuilt from the box.

The save passed in is never changed. After an upgraded project is opened and edited, the autosave writes it back in the current version, so each save is converted only until its next save.

`parseProject(data)` is a shortcut that returns the project, or `null` when it can't be opened.

## Projects that can't be opened

A stored project that `readProject` refuses (made by a newer version of the app, or damaged) is **never opened**: it stays in the Projects list marked "Can't open", untouched. This matters: opening it as an empty design would let the next autosave overwrite the real data. On startup, the app opens the last project only if it reads cleanly, otherwise the most recently edited readable one, otherwise a new empty project.

## Changing the save format

### Does it need a new version?

**Yes**, if an older app or older save would misread the data. For example:

- adding a saved field that must always be present
- renaming or removing a saved field
- changing what a field means or its units (e.g. storing position from the left instead of the centre)
- changing how a part kind is stored, or merging or splitting kinds

**Usually no**, if old saves simply don't have it and a default is correct. For example, an optional field whose absence means the old behaviour (like a part's `color`: absent means the standard look). Then `validate` must treat "missing" as that default. When in doubt, bump: a converter is cheap, a broken project isn't.

App changes that don't touch saved data (new buttons, visuals, fixes) never need a new version.

### Checklist

1. **Keep a sample of the current format first.** Before changing any code, save a project that uses every feature in the current version to `src/lib/fixtures/v<N>-<name>.json`. There must be at least one sample per version (a test checks this). The easiest way: open the app, build such a project, "Save to file", and copy the file in.
2. **Bump `FORMAT_VERSION`** to `N + 1`, and update the `ProjectData` type.
3. **Add a converter** `N: (data) => ({ ...data, formatVersion: N + 1, /* changes */ })` to `MIGRATIONS`. It turns a version N save into version N + 1.
4. **Update `validate`** for the new shape, and `toProjectData` so saves are written in it.
5. **Add tests** in `src/lib/project.test.ts`: the version N sample opens, and opens into the same design (or the intended changed one). For a meaningful conversion, also save the expected result as `v<N>-<name>.expected.json` next to the sample and compare against it.
6. **Save a sample of the new version** too (`v<N+1>-<name>.json`), so the next change has one.
7. **Run** `pnpm test`, `pnpm build`, `pnpm lint`, and open an old project in the browser.
8. **Record the change** in `docs/decisions.md`.

### Rules for converters

- **Never edit a converter once it's released.** Saves in that version are out there. Fix a mistake with a new version and a new converter instead.
- **Never delete a converter or a sample.** Every old version must keep opening.
- **One step per converter**: N to N + 1 only. Never jump versions.
- **Pure and non-mutating**: build new objects (`{ ...data }`), don't change the input, don't read the clock, storage or the current app state.
- **Defensive**: the input may be hand-edited or damaged. Tolerate missing and wrong-typed fields, and leave the real checking to `validate`.
- **Plain data only**: a converter works on raw JSON, not app types, because the types change with the format while the converter must stay frozen.

### Version history

| Version | Converter from the previous version | Samples |
|---|---|---|
| 1 | (first version) | `v1-minimal` (earliest shape: thickness and parts only), `v1-full` (every v1 feature) |
| 2 | 1→2: v1 gained `unitDepth` and `boxes` as optional fields over time. From v2 they're always there; the converter fills in 600 mm and no boxes when missing. | `v2-full` |
| 3 | 2→3: adds `room` (which side walls are used, and the room's inside width and depth). The converter adds a one-wall room of 2400 × 1800 mm. Parts and boxes may have `wall: 'left' \| 'right'`; absent means the back wall, so older parts need no change. | `v3-room` (U-shaped, parts on every wall) |
| 4 | 3→4: adds doors: a `door` part kind with optional `double`, `hinge: 'right'` (single doors; absent means left) and `inset` (absent means overlay), and drawers' optional `extension: 'full'` (absent means standard runners) and `overlay` (absent means an inset front). No older save has either, so the converter only changes the version; the bump makes older apps refuse such saves instead of dropping them. | `v4-doors` (overlay double door on the back wall, inset right-hinged door on the left wall), `v4-drawers` (full-extension, standard and too-shallow drawers), `v4-drawer-fronts` (overlay drawers under an overlay door) |
| 5 | 4→5: `thickness` gains `front` (doors and drawer fronts) and `drawer` (drawer box sides and backs), which the converter sets to the save's `body` thickness, so every part comes out the same size. Adds optional `boardNames` (a name per board for the cut list; absent means none named). | `v5-boards` (every board its own thickness and named, an overlay drawer and a double door) |
| 6 | 5→6: adds optional `grainedBoards` (the boards with a grain; absent means none) and parts' optional `bands` (banded edges: `front`, `back`, `top`, `bottom`, `left`, `right`) and `grain` (`width`, `height` or `depth`, the dimension the grain runs along). Absent `bands` and `grain` mean the part's usual ones. The converter only changes the version; the bump makes older apps refuse such saves instead of dropping the fields. | `v6-finish` (body and fronts with grain, a box top banded on its ends, a door and a drawer front with turned grain, an open shelf banded all round) |
| 7 | 6→7: adds `holePitch` (the spacing of shelf-pin holes in mm, always present), which the converter sets to 32; shelves aren't moved. Doors gain optional `openAngle` (155 or 170 for wide-angle hinges; absent means 110°) and `softClose` (absent means ordinary hinges); drawers gain optional `close` (`soft` or `push`; absent means ordinary runners); doors and drawers gain optional `noHandle` (absent means they have a handle). | `v7-hinges` (the v6 sample with 37 mm hole spacing, a soft-close 155° double door, an inset single door without a handle and a push-to-open drawer) |
| 8 | 7→8: adds optional `boardColors` and `edgeColors`, a `#rrggbb` per board (body, back, front, drawer) for its parts and for its edge banding. Absent means the standard look and edges like their board. The converter only changes the version; the bump makes older apps refuse such saves instead of dropping the colours. | `v8-colors` (the v7 sample with a white body with oak edges, oak fronts, and a shelf with a colour of its own) |
| 9 | 8→9: doors gain optional `sliding` (the number of panels in a set of sliding doors, 2 to 4; absent means a hinged door) and `overlap` (mm the panels overlap; absent means 50). The converter only changes the version; the bump makes older apps refuse such saves instead of showing the set as one hinged door. | `v9-sliding` (the v8 sample with a set of three sliding doors, 80 mm overlap) |
| 10 | 9→10: adds the `filler` and `cornice` part kinds (boards of the front thickness) and the room's optional `height` (floor to ceiling in mm; absent means no ceiling is set). The converter only changes the version; the bump makes older apps refuse such saves instead of dropping the trim and the ceiling. | `v10-trim` (a cornice, a filler strip and a 2400 mm ceiling) |
| 11 | 10→11: adds optional `z` on parts and boxes (mm from the wall to the back face; absent means automatic placement, as before). A box's panels get theirs from the box. The converter only changes the version; the bump makes older apps refuse such saves instead of putting the parts back against the back panel. | `v11-depth` (a box set 40 mm out, a filler strip at 100 mm and a sliding door set at 700 mm) |
| 12 | 11→12: adds optional `boardMaterials`, the material of each board (`chipboard`, `mdf`, `plywood` or `solid`). Absent means chipboard, which is also stored as nothing. The converter only changes the version; the bump makes older apps refuse such saves instead of dropping the materials. | `v12-materials` (the v11 sample with a plywood body, solid-wood fronts and an MDF back) |
| 13 | 12→13: adds optional `joints`, how the carcass is joined (`confirmat` or `cam`). Absent means plain screws, which is also stored as nothing. The converter only changes the version; the bump makes older apps refuse such saves instead of dropping the choice. | `v13-joints` (the v12 sample with cam locks and dowels) |
| 14 | 13→14: doors and drawers gain optional `handle` (`bar`, `knob`, `profile`, or `push` on hinged doors only; absent means a handle or knob, as before). `noHandle` is unchanged and wins. The converter only changes the version; the bump makes older apps refuse such saves instead of turning the choice back into a plain handle. | `v14-handles` (a J-profile door, a push-to-open door, a double door with knobs and a drawer with a bar handle) |
| 15 | 14→15: doors gain optional `pane` (`glass` or `mirror`; absent means a board door). A pane door has its own 4 mm thickness and no colour, banding or grain. The converter only changes the version; the bump makes older apps refuse such saves instead of showing glass as a board. | `v15-panes` (a glass door, a set of two sliding mirror doors and a board double door) |

Add a row for every new version.

## The browser database version (`DB_VERSION`)

The IndexedDB database has its own version, for its layout rather than the projects inside it. Current layout (version 2): a `projects` store (one record per project: id, name, created and edited times, and its `design`, which is `ProjectData`) and a `meta` store (the last-open project's id).

- **Version 1** kept a single design under the `autosave` key, from before there were projects. On startup, `migrateLegacyDesign` turns it into a project named "My first project", writing the new project and deleting the old key in one transaction, so a failure can't lose it.
- To change the layout: bump `DB_VERSION`, create or change stores in `onupgradeneeded`, and move data in one transaction.
- An upgrade waits until every tab using the old version closes its connection. Each connection closes itself when a newer version asks (`onversionchange`), and if an old tab still holds on, the app shows "close other Boardcut tabs".
