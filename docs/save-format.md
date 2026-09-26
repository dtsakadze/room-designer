# Save format and versions

How projects are saved, and how to change what's saved without breaking projects people already have. Read this before changing anything that ends up in a save.

## What gets saved

A project's design is saved as `ProjectData` (`src/lib/project.ts`): plain JSON with a `formatVersion` number, the board thicknesses, unit depth, the list of parts (`pieces`), boxes, and the colour for new parts. Selection, the view and undo history are not saved.

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

Add a row for every new version.

## The browser database version (`DB_VERSION`)

The IndexedDB database has its own version, for its layout rather than the projects inside it. Current layout (version 2): a `projects` store (one record per project: id, name, created and edited times, and its `design`, which is `ProjectData`) and a `meta` store (the last-open project's id).

- **Version 1** kept a single design under the `autosave` key, from before there were projects. On startup, `migrateLegacyDesign` turns it into a project named "My first project", writing the new project and deleting the old key in one transaction, so a failure can't lose it.
- To change the layout: bump `DB_VERSION`, create or change stores in `onupgradeneeded`, and move data in one transaction.
- An upgrade waits until every tab using the old version closes its connection. Each connection closes itself when a newer version asks (`onversionchange`), and if an old tab still holds on, the app shows "close other Boardcut tabs".
