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

**Wardrobes on two or three walls** (2026-09-28)
*Decision*: a project has a room: the back wall is always used, and a left and/or right wall can be switched on (L- or U-shape), with the room's inside width and depth. Each part and box stores its wall (`wall`, absent = back). Each wall is edited on its own in the usual front view, with x = 0 the middle of that wall; a wall switch appears above the drawing only when there's more than one wall. The front view shows the walls at both ends and faint outlines of the parts on the neighbouring walls that come within this wall's unit depth, and the gap lines measure to both. Top and 3D show the whole room; the side and back views show the current wall's unit. Parts are placed in room coordinates through `roomBox` (walls only turn by right angles), each wall's unit gets its own `depthStart`, and clashes are checked across walls, so units that collide in a corner turn red. Switching a wall off deletes its parts after an inline warning, as one undoable step. The cut list covers every wall together.
*Why*: closets are often built round two or three walls, and the app should stay as simple as it was for a single unit: editing one wall at a time keeps the 2D editing unchanged, and a one-wall project shows no new controls on the canvas. The room size says where the corners are, so the walls can be drawn and the runs placed correctly in Top and 3D.
*Instead of*: one long unfolded front view with every wall side by side (moving parts across corners, gap lines and placing new parts all get more complicated), joining the runs where their parts end without a room size (a U's two sides would only be as far apart as the back run is wide), and keeping or moving the parts of a wall that's switched off (hidden parts would still be in the cut list). Corner units, a door wall and other room shapes are left for later.

**Hinged doors as a part** (2026-09-28)
*Decision*: a door is an ordinary part (`kind: 'door'`), a board of body thickness facing forward, sized and moved like any other. Options: `double` (two leaves meeting in the middle with a 3 mm gap, each hinged on its outer side), `hinge` (a single door's side, left by default) and `inset` (overlay by default). Parts still have no z, so `depthStart` places a door like the plinth and front rails: overlay just in front of its wall's unit, inset flush inside it. That makes an inset door sized over the carcass clash, and shows doors in the right place in the side, top and 3D views. Doors are see-through in the front and back views and in 3D, and don't count as neighbours in other parts' gap lines, so the inside stays visible and editable. In the front view they're drawn over everything else (they're nearest), and clicking goes down the stack from the front: the door, then the parts inside, then the back panel, then round to the door again. The front view draws the usual V pointing at the hinges. A double door is cut as two leaves.
*Why*: the smallest change that fits the model: no new store, no z yet, and the size stays in the person's hands, since how much a door overlaps or how big its gaps are varies by hinge.
*Instead of*: doors owned by a box and sized from it automatically (would tie doors to boxes, while many units are built from loose panels), and an open/closed state (nothing to design with it yet). Hinges and handles in a hardware list are left for later.

**Drawers built from boards, on runners** (2026-09-28)
*Decision*: a drawer stays one part, the space it fills: as wide as its opening, as high as its front, and as deep as it may go, front included. Its boards are worked out from that (`drawerParts`), not stored: a front of the full size, and behind it a box narrower by a 13 mm runner gap each side, 30 mm lower than the front, as long as the longest standard runner (250–700 mm in 50 mm steps) that fits behind the front. The sides stand on a bottom of back-panel board and the back fits between them. The parts go into the cut list and 3D. In the cut list they're grouped under their drawer, after the unit's boards, one group per drawer design (identical boards, whatever the runner type), so it's clear what builds a drawer; the panel also gets a Hardware list with a pair of runners per drawer, by type and length. A drawer's `extension` (standard or full) is recorded for the hardware list; it doesn't change the sizes. Drawers now sit with their front flush with the front of their wall's unit (they used to stand against the back).
*Why*: the drawer as its opening is how it's sized on the drawing, and every size that follows from it is a rule of thumb that holds for common side-mounted runners, so deriving the boards keeps them right as the drawer is resized, with nothing to keep in sync. A drawer's front belongs at the front.
*Instead of*: storing the boards as pieces owned by the drawer like a box's panels (a second copy of the same information, rebuilt on every change, for no gain while the boards aren't edited one by one), and exact gaps per runner brand (varies; a setting can come later). Overlay drawer fronts, undermount runners and handles are left for later.

**Cut list in sections** (2026-09-28)
*Decision*: the cut list is split into sections with headings: Panels (sides, tops and bottoms, back panels, plinths, rails), Shelves and dividers, Doors, then one group per drawer design. Within a section, parts of a kind stay together in a fixed order (sides before tops, a drawer's front, sides, back, bottom), biggest first. Every board kind must belong to a section (a test checks it).
*Why*: a list sorted by thickness then size mixed kinds together, so checking it against the design meant hunting for each part. Grouped like the design is built, it reads in the order you'd check it.
*Instead of*: the previous order, thickest boards first then biggest (useful for planning sheets, which matters less than checking the list while there's no sheet layout yet).

**Overlay drawer fronts and front gaps** (2026-09-28)
*Decision*: a drawer's front is inset (the default, as before) or overlay (`overlay`). An inset drawer is sized to its opening; an overlay drawer is sized to its front, which covers the unit's edges, and the box is worked out for an opening a body board's thickness smaller all round. An overlay front stands in front of the unit, like an overlay door. Every front is 1.5 mm smaller than its space on each edge, so two fronts side by side or stacked leave the usual 3 mm between them. The clash check now tests a drawer's real boards (and a double door's leaves) rather than the whole space, since an overlay drawer's space reaches over the side panels without its box touching them.
*Why*: drawers next to overlay doors have to line up with them, and fronts that fill their space exactly would rub. Sizing an overlay drawer by its front matches how you'd line it up with the doors.
*Instead of*: working out each overlay front's reach from the boards around it (overlapping neighbours, rails, shelves: fragile for little gain; the one-board rule errs towards a slightly smaller box between stacked drawers), a gap setting (a fixed 3 mm is the common reveal; a setting can come later), and separate false fronts on a box front.

**Hiding doors is a view setting** (2026-09-28)
*Decision*: a Hide doors / Show doors button (only when the design has doors) takes doors out of every view, 2D and 3D, so they can't be clicked and the inside can be edited directly. It's a personal preference in localStorage (`room-designer:show-doors`), like the units, not part of the project or undo. Hidden doors stay in the cut list, the Parts list and the clash check. Hiding lets go of selected doors, so nothing unseen can be deleted or nudged; selecting a door from the Parts list shows doors again.
*Why*: with doors drawn on top, every edit behind one took an extra click, and a drag grabbed the door. Drawer fronts don't need it: nothing sits behind a drawer but the back panel.
*Instead of*: a per-door "open" state saved in the project (nothing to design with it), and hiding doors only in the front view (3D gets just as cluttered).

**Door swings in the top view, checked in a room** (2026-09-28)
*Decision*: the top view draws each door leaf swung open to 110° (`DOOR_OPEN_ANGLE`, what concealed hinges usually allow) from its hinge on the door's front face, with a dashed arc for the floor it sweeps (`lib/swing.ts`, in room coordinates, so doors on side walls swing across the room). A double door's leaves each turn on their outer side. In a room with side walls, each swing is checked against the room's back and side walls (the front of the room is open) and against parts and door swings on the other walls where their heights overlap; a swing that hits something is red, and the door's panel names what it hits. Doors on the same wall aren't checked against each other, nor are rooms with one wall. Framing the top view includes the swings; a selected door's swing is blue, hidden doors have none (but are still checked).
*Why*: the front view already shows the hinge side; what it can't show is the floor a door needs and whether it runs into something, which in an L- or U-shaped room is the classic corner mistake. Past 90° a door swings back behind its hinge side, which is exactly where it meets a wall or the next unit, so the check uses the full 110°.
*Instead of*: a 90° arc (the drawing convention, but it hides the corner problems), checking neighbouring doors on the same wall (doors hinged on one panel from both sides meet past square when both are fully open, as designed; flagging it would be noise), checking a one-wall design against a room size that doesn't mean anything there, and hinge marks in the side and back views.

**Hanging rods in the hardware list** (2026-09-28)
*Decision*: hanging rods go in the cut list's Hardware section, by diameter and length (the length to cut a stock rod to), identical rods counted together, each with two end supports (listed by diameter). Hardware rows are one list of item kinds (`runners`, `rod`, `rod-supports`), runners first.
*Why*: a rod is bought and cut to length, not cut from board, but it's still on the shopping list; leaving it out with a note meant working it out by hand.
*Instead of*: listing rods with the boards (they have no board thickness, and the columns don't fit), and stock rod lengths (vary by shop; the cut length is what's needed).

**Boards for fronts and drawer boxes, and board names** (2026-09-29)
*Decision*: a project has four boards instead of two: body (carcass, shelves, dividers, plinths, rails), back (back panels, drawer bottoms), fronts (doors, drawer fronts) and drawer boxes (drawer sides and backs). Each has a thickness every part of it follows (`BOARD` and `drawerParts` say which board a part is cut from) and an optional name, shown in the cut list's Board column instead of the role. Both are part of the design: saved, and undone like any change. An overlay drawer still reaches over the carcass by a body board's thickness, and stands out in front of it by its front's thickness.
*Why*: fronts are often a different material and thickness from the carcass (lacquered or veneered MDF), and drawer boxes thinner (12–16 mm), so a single body board made the cut list wrong or vague for common builds, and drawer boxes the wrong size when their sides are thinner.
*Instead of*: a board per part kind (too many settings for what people actually vary), a material library shared across projects (worth it later, with prices or sheet sizes), and a per-part material choice (fights "thickness belongs to the project").

**Grain direction and edge banding** (2026-10-03)
*Decision*: both are worked out from the part's kind, and can be changed per part. Banding (`autoBands`, `src/lib/edges.ts`): the front edge of sides, tops, shelves, dividers and front rails; every edge of a door and a drawer front; the top edge of drawer sides and backs; nothing on backs, plinths, back rails and drawer bottoms. Grain (`autoGrain`) runs along the part as it stands: up and down on sides, dividers, backs and doors, left to right on tops, shelves, plinths, rails and drawer fronts. A part's own choice is stored as `bands` (its banded edges, named by the way they face: front, back, top, bottom, left, right) and `grain` (the dimension the grain runs along), and only when it differs from the usual, so untouched parts follow better defaults later. Whether a board has a grain at all is a project setting per board (`grainedBoards`). On a board with grain the cut list's Length is the size along the grain, as shops read it; on others it stays the longer size. The cut list counts banded edges along the length and along the width, shows them as a small sketch, and adds up the banding per board. A box's panels can have their own banding and grain, kept through rebuilds and copies like their colour; a drawer's banding is fixed, but its front's grain can turn. Sizes stay finished sizes (banding thickness isn't taken off).
*Why*: most parts need the same banding and grain, so making people set every part would be busywork and easy to get wrong, but real builds have exceptions (a visible top end, open shelving, horizontal-grain doors). Plain boards (white melamine) have no grain, and forcing length along an arbitrary direction there would stop the shop turning parts to save board.
*Instead of*: setting everything by hand per part, a fixed rule with no overrides, grain on every board, and taking banding thickness off the cut sizes (shops differ on whether they want finished or pre-banding sizes; finished is the safer default to state).

**CSV export of the cut list and hardware** (2026-10-04)
*Decision*: the Cut list panel has Download CSV buttons for the cut list and the hardware list, two separate files named after the project. The cut list has a row per row of the panel: section (or drawer group), part, quantity, length, width and thickness in the chosen units (named in the headings), board name, whether the grain runs along the length, and how many edges along the length and along the width are banded. Hardware has item, quantity and unit (pairs for runners, pcs otherwise), worded as in the panel (`describeHardware`). Comma-separated, CRLF, with a UTF-8 byte order mark so Excel shows ⌀ and ° (`lib/csv.ts`).
*Why*: board shops and cutting optimisers take parts lists as CSV, and a spreadsheet is the usual place to price and order hardware.
*Instead of*: one combined file (the two lists have different columns, and optimisers want parts only), always exporting mm (the units setting is what people read everywhere else), and an optimiser's own format (each one differs; CSV imports into all of them).

**Printing drawings and the cut list** (2026-10-04)
*Decision*: File → Print… (and ⌘P, which works even in text fields, since the browser would otherwise print the screen) opens a dialog to choose the drawings and/or the cut list and A4 or A3 landscape (remembered in `room-designer:print-paper`), and Lines only, which drops the light shading of faces and cut edges from the drawings (remembered in `room-designer:print-lines-only`). Printing renders print-only pages into `document.body` (outside `#root`, which print CSS hides), sets `@page` to the paper, calls `window.print()`, and removes them on `afterprint`. Drawings: front and side (from the left) of each wall's unit, then the top of the whole room, each on its own page at the largest standard scale that fits (1:1 to 1:500) with 22 mm left round it for dimensions. They show overall width and height, and from the front the clear openings between sides and dividers and the clear heights inside each (`lib/drawing.ts`; gaps under 20 mm unlabelled); doors are dashed so the inside shows. Each page has a title block (project, view, scale, units, date). The cut list prints the same tables as the panel (`CutListTables`).
*Why*: the workshop and board shop work from paper or a PDF; the browser's print and Save as PDF cover both without a PDF library.
*Instead of*: generating PDFs in the app (a large dependency for what print already does), printing the screen as it is (zoom, selection and UI on the page), and dimensioning every board (cluttered; the cut list has every part's size).

**Carcass fixings and handles in the hardware list** (2026-10-04)
*Decision*: the Hardware list also counts carcass screws, back panel fixings and handles (`fixings.ts`). Carcass screws: wherever a top, bottom or rail meets a side or divider on the same wall (end against face, or face against end, within 1 mm), 3 screws, or 2 when the shallower board is under 300 mm deep (rails). Back fixings: one nail or screw per 150 mm of each back panel's edge, rounded up. Handles: one per door leaf and per drawer, except push-to-open drawers and doors or drawers whose handle was taken off (`noHandle`, a checkbox in the Selected panel).
*Why*: these are on every shopping list for a build, and they follow from the design, so working them out saves counting by hand. Handle-less fronts are common (push-to-open, routed grips), hence the opt-out.
*Instead of*: listing screw sizes (depend on the board and the brand), counting joints for loose parts placed by eye with gaps (a part that doesn't touch isn't fixed), and a handle type choice (left for later).

**Soft-close and push-to-open drawer runners** (2026-10-04)
*Decision*: each drawer chooses how its runners close: ordinary (the default, stored as nothing), soft-close or push-to-open (`close`). It doesn't change the drawer's boards; the Hardware list counts runner pairs of each kind apart, after the extension type.
*Why*: runners are bought by this, and push-to-open is how handle-less fronts work, so it belongs on the shopping list.
*Instead of*: a project-wide setting (kitchens and wardrobes often mix them), and load ratings, left for later.

**Hinges** (2026-10-04)
*Decision*: doors are hung on cup hinges, counted per leaf by height (2 up to 900 mm, 3 up to 1600, 4 up to 2000, 5 above) in the Hardware list, by kind: fit, opening angle and soft-close. The fit is worked out, not chosen: inset for an inset door, half overlay when another overlay leaf on the same wall and height is hinged on the same panel from the other side (hinged edges less than a body board apart), full overlay otherwise. Each door can have wide-angle hinges (155° or 170°; 110° is standard) and soft-close ones; the angle also sets how far its swing is drawn and checked in the top view.
*Why*: hinges are bought by these, and how many a door needs follows from its height, so working them out saves a step and a mistake; the fit follows from where the door is, which the design already says. Wide-angle hinges are the usual fix for a door that hits a wall in a corner.
*Instead of*: choosing the hinge fit per door (easy to get wrong when doors share a panel), and a project-wide angle or soft-close (doors in one wardrobe often differ, e.g. the corner one).

**Fit between sides** (2026-10-04)
*Decision*: loose shelves, tops/bottoms, plinths, rails, drawers and rods get a Fit between sides button that sets their X and width to the gap between the nearest side panel or divider on each side of their middle, on their wall, that reaches their height (`fitBetweenSides`). Face to face, except an overlay drawer, which runs across both panels (its front covers their edges). Disabled, with a reason, when there's no panel on one side or the part already fits.
*Why*: sides often end up at odd positions (18 mm boards on a 10 mm grid), so getting a part to fit exactly meant working out and typing numbers like -1182 and 1211 by hand.
*Instead of*: snapping parts' ends to nearby panel faces while dragging (harder to get right with many panels, and still not exact when the drag stops short).

**Adjustable shelves on shelf-pin holes** (2026-10-03)
*Decision*: an adjustable shelf (one not ticked Fixed) sits on a hole of the side or divider it rests on (the one its left end meets, or its right end if there's none on the left, within 20 mm): holes are every `holePitch` mm (a project setting, 32 by default) up from that panel's bottom edge, from one pitch up to one pitch below its top, and the shelf's underside sits on the hole. With no panel next to it, holes count up from the floor. It snaps whenever the shelf itself is written (added, moved, resized, duplicated, made adjustable) and every adjustable shelf re-snaps when the spacing changes; moving only a side doesn't move the shelves, and opening a project doesn't move anything, so older projects look the same until a shelf is touched. Arrow keys move an adjustable shelf one hole at a time. The front view draws a tick at each hole on the faces adjustable shelves rest on; the left and right views, which show those faces, draw the holes as dots in two columns 37 mm in from the front and back edges (the usual System 32 setback; one column in the middle of a panel under 111 mm deep). The Hardware list counts four pins per adjustable shelf. The spacing is part of the design (saved, undone).
*Why*: a shelf on pins can only go where holes are drilled, so a free height would give a design that can't be built; 32 mm ("System 32") is what most hinges, drills and pre-drilled panels use. Fixed shelves are screwed and stay free, so any height is still possible.
*Instead of*: snapping only while dragging (typed heights would still miss holes), holes counted from the floor everywhere (wrong when a unit stands on a plinth or isn't on the floor), drawing holes on every side (clutter on sides with no adjustable shelves), and re-snapping every shelf on every change (moving a side would shift shelves unexpectedly).

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

**Save format v3: the room** (2026-09-28)
*Decision*: `FORMAT_VERSION` 3 adds a required `room` (`left`, `right`, `width`, `depth`) and an optional `wall` on parts and boxes. Converter 2→3 adds a one-wall room (2400 × 1800 mm). `validate` switches on any wall that has parts, so no part can be hidden.
*Why*: the room is part of the design. Every older save stood on the back wall alone, which is exactly what absent `wall` and a one-wall room mean.

**Save format v4: doors** (2026-09-28)
*Decision*: `FORMAT_VERSION` 4 adds the `door` kind and its optional `double`, `hinge` and `inset` fields. Converter 3→4 only changes the version.
*Why*: the new fields are optional, but an older app drops parts of a kind it doesn't know, so a save with doors opened there would lose them. With the bump, an older app refuses it as "newer" instead.
Drawers' `extension` and `overlay` were added to v4 too (2026-09-28): v4 hadn't been released or pushed yet, so no save or app outside this machine knows v4 without it.

**Save format v5: fronts and drawer-box boards, board names** (2026-09-29)
*Decision*: `FORMAT_VERSION` 5 adds `front` and `drawer` to `thickness`, and an optional `boardNames`. Converter 4→5 sets both new thicknesses to the save's body thickness; `validate` falls back to the body thickness too, and keeps only known boards' names, trimmed to 60 characters.
*Why*: fronts and drawer boxes were cut from the body board, so starting them at its thickness opens every older project into exactly the same design. A version bump because an older app would drop the new thicknesses and names.

**Save format v6: grain and edge banding** (2026-10-03)
*Decision*: `FORMAT_VERSION` 6 adds an optional `grainedBoards` (boards with a grain) and parts' optional `bands` and `grain`. Converter 5→6 only changes the version: absent, each means the usual banding and no grain, which is what older saves had. `validate` keeps only known boards and edge names, and `normalizePiece` drops edges and grain a part can't have, and any that match the usual.
*Why*: an older app would drop the new fields silently, so a project opened there would lose its banding and grain; with the bump it refuses the save as "newer" instead.
`holePitch` (the shelf-pin hole spacing, always present from v6 on; converter 5→6 sets 32) was added to v6 too (2026-10-03): v6 hadn't been released yet, so no save outside this machine knows v6 without it. Reversed on 2026-10-04: v6 was already live, so `holePitch` moved to v7.

**Save format v7: shelf-pin holes and hinges** (2026-10-04)
*Decision*: `FORMAT_VERSION` 7 adds `holePitch` (converter 6→7 sets 32), doors' optional `openAngle` and `softClose`, drawers' optional `close` (soft-close or push-to-open runners) and doors' and drawers' optional `noHandle` (both added 2026-10-04 before v7 was pushed). This replaces adding `holePitch` to v6 (see the v6 entry): v6 had already gone live on boardcut.app (it deploys on every push to `main`), so saves without `holePitch` exist in v6, and its converter and sample are back to exactly what was pushed.
*Why*: a version that's live is frozen like a released one; an older app would drop the new fields, so they need a version of their own.

**Versioned save format with converters** (2026-09-25)
*Decision*: every save has a `formatVersion`; older saves are upgraded one step at a time by converters, newer ones are refused, and a project that can't be read is never opened (so autosave can't overwrite it). Details in [save-format.md](save-format.md).
*Why*: files and autosaves must keep opening after the app changes, and data must never be lost to a version mismatch.

## Engineering

**Unit tests for all logic, no browser tests** (2026-09-29)
*Decision*: every lib module, both stores and the canvas's pure helpers (views, handles, coordinates) have Vitest tests, run in Node with no extra libraries: small stand-ins for `localStorage` and page events (`src/test/browser.ts`), and an in-memory `ProjectStorage` in place of IndexedDB for the projects store. React components and the IndexedDB code itself aren't unit-tested.
*Why*: changes kept touching shared logic (boards, drawers, the save format, undo), and the store and geometry were barely covered, so a regression could slip through unnoticed. Testing through the `ProjectStorage` interface covers autosave and project switching without a fake database.
*Instead of*: Playwright browser tests (a new dependency, declined for now), and jsdom with Testing Library for components (more dependencies, for code that's mostly layout).

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

**Units setting is display only, per person** (2026-09-25)
*Decision*: a Units switch (mm, cm, m, in) changes how lengths are shown and typed; designs stay stored in whole millimetres. The choice is a personal preference kept in localStorage, the same in every project, not part of a project or its save.
*Why*: no save format change, and a project looks the same to everyone whatever unit they prefer. Canvas labels show the unit (e.g. "116.4 cm") so they're never ambiguous; typed numbers accept a comma as the decimal separator.

**Sidebar tabs and an inspector on the right** (2026-09-25)
*Decision*: the left sidebar keeps the project header and puts everything else in four tabs: Add (new-part colour, carcass, panels, fittings), Parts (parts list, overlap warning, Clear all), Settings (units, boards) and File (open and save). The Selected inspector moved to its own panel right of the canvas. The Parts tab shows the part count and a red dot when parts overlap. The "Units" heading above the Box button became "Carcass", since Units now means the measurement setting.
*Why*: the single long sidebar needed scrolling to reach the inspector while editing. Tabs were chosen over hover flyouts, which close when the mouse slips off, don't work on touch screens and open by accident.

**Foldable sidebar sections instead of tabs** (2026-09-25)
*Decision*: the sidebar's tabs were replaced with foldable sections (Add and Parts open by default, Settings and File folded), each remembering whether it's open in this browser. The Parts header keeps the part count and the red overlap dot, so they show while folded. The inspector stays on the right. Replaces the tabs from earlier the same day.
*Why*: more sections are coming, and four tabs wouldn't scale; a new section is just another `CollapsibleSection`. Chosen by the user over a VS Code-style icon rail.

**Releases: semantic versions, a changelog shown in the app** (2026-09-26)
*Decision*: versions are `MAJOR.MINOR.PATCH`, starting at 1.0.0: minor for features, patch for fixes, major for removals, breaking behaviour or big redesigns. `CHANGELOG.md` gets a line for every user-facing change and is shown in the app as "What's new"; after an update, a one-time notice says what version people are on. Releases are git tags (`v1.1.0`) with GitHub releases. Details in [releasing.md](releasing.md).
*Why*: people using a hosted or self-hosted copy need to know which version they have and what changed, and a changelog in the app reaches them without watching the repository.

**MIT licence** (2026-09-26)
*Decision*: the project is released under the MIT licence.
*Why*: the simplest common open-source licence; it keeps the door open for paid hosted features later. Chosen over AGPL-3.0 and Apache-2.0.

**Crash screen** (2026-09-26)
*Decision*: an error boundary shows "Something went wrong" with a Reload button and the error details (with the app version) instead of a blank page.
*Why*: a rendering bug used to blank the whole app; projects are autosaved, so telling people a reload is safe is the right fallback.

**Autosave never writes a broken design** (2026-09-26)
*Decision*: before each autosave, the design is checked with `readProject`; if it fails, nothing is written and the last good save stays.
*Why*: found while testing the crash screen: a bug that corrupts the design in memory would otherwise be autosaved over the good project, turning it into "can't open".

**Releases are prepared locally and published by a GitHub Action** (2026-09-26)
*Decision*: `pnpm release <patch|minor|major>` moves the changelog's "Unreleased" notes under the new version, bumps `package.json`, runs the checks, commits and tags. Pushing the tag runs the Release Action, which checks the tag, tests and builds, and creates the GitHub release with the changelog notes and a zip of the build. The Action doesn't deploy yet.
*Why*: releases are easy to get wrong by hand. The changelog is updated before tagging rather than by the Action, so the tagged commit already contains the finished changelog and version.


**Public repository, `main` protected** (2026-09-26)
*Decision*: the repository is public; only the owner can push, others contribute through issues and pull requests (Actions on a first-time contributor's PR wait for approval). A GitHub ruleset, "Protect main", blocks force-pushes to and deletion of `main` for everyone, the owner included. Change it under Settings → Rules → Rulesets.
*Why*: open to contributions without risking the history or the release tags that point into it.

**Search and link-preview tags** (2026-09-26)
*Decision*: `index.html` has a title, description, Open Graph and Twitter/X card tags (no image yet). The full-URL parts (canonical link, `og:url`, `sitemap.xml`, and the sitemap line in `robots.txt`) are added at build time only when `SITE_URL` is set, by a small plugin in `vite.config.ts`. The app is a single page, so there's one set of tags.
*Why*: good previews when links are shared, and a clear main address for search engines. The address isn't chosen yet, and self-hosted copies shouldn't claim to be the main site or point at it, so the URL comes from the build, not the source.

**Renamed to Boardcut, at boardcut.app** (2026-09-26)
*Decision*: the app is called Boardcut (was Room Designer) and will be served at https://boardcut.app. The name appears in the page title, sidebar, messages, docs, the package name and release zips (`boardcut-v1.1.0.zip`); saved files default to `boardcut-<date>.json`. Browser storage keeps the old `room-designer` names (IndexedDB database and localStorage keys).
*Why*: a short, memorable name that says what it's for (boards and a cut list), not tied to closets only. Storage names are invisible to people, and renaming them would lose everyone's stored projects and settings.

**Hosted on Cloudflare Workers** (2026-09-26)
*Decision*: boardcut.app is served by Cloudflare Workers as static files only (`wrangler.jsonc` points at `dist/`, no Worker code), built and deployed by Cloudflare's Git integration with `SITE_URL=https://boardcut.app` set as a build variable. Chosen over GitHub Pages and Vercel.
*Why*: free with unlimited bandwidth, a custom domain, preview links for branches, and room for a backend (Workers, D1) later on the same host, so the address, and with it people's stored projects, never has to move. Vercel's free plan doesn't allow commercial use.
