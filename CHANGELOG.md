# Changelog

What changed in each release, newest first. The app shows this file in its "What's new" panel, so write for people using the app, one line per change, and keep the format: a `## <version> — <date>` heading, then `- ` lines.

## Unreleased

- Edge banding in the cut list: an Edges column sketches which edges of each board to band, and a new Edge banding section adds up how much each board needs. Parts start with the edges that show (the front edge of panels and shelves, all round on doors and drawer fronts); select a part to tick other edges. For a box, select one of its panels.
- Grain direction: tick Grain on a board under Settings → Boards (for wood-look boards), and the cut list gives each part's length along the grain, so the shop cuts it the right way round. Grain runs up and down on sides and doors and left to right on shelves and drawer fronts; select a part to turn it.

## 1.4.0 — 2026-09-29

- A tidier Settings section: units as one switch, each board in its own card (what it's for, its thickness and its material), and the depth for new parts in its own group.

- Fronts and drawer boxes have boards of their own: set a thickness for doors and drawer fronts, and one for drawer sides and backs, under Settings → Boards. Every board can also be named (say, "19 mm oak-veneer MDF"), and the cut list shows that name, so you can see what to buy. Existing projects keep the sizes they had.

- Hanging rods are in the cut list's Hardware section now, by diameter and the length to cut them to, with two end supports for each rod.

- The top view shows how each door opens: the leaf swung open to 110°, as far as most hinges go, and the arc it sweeps. In an L- or U-shaped room, a door that would hit a wall, a door on the next wall or a part there turns red, and its panel says what it hits.

- Hide doors: a button next to Fit view takes the doors out of every view, so you can click and drag the parts inside straight away. They stay in the cut list, and the setting is remembered.

## 1.3.0 — 2026-09-28

- The cut list is easier to check: boards are grouped into Panels, Shelves and dividers, Doors and each drawer, with the same kind of part kept together, biggest first.

- Drawers are now real drawers: each one is built from a front, two sides, a back and a bottom, sized to leave room for the runners, and those boards are in the cut list, grouped under their drawer (identical drawers together). Choose an inset front (inside the opening) or an overlay one (covering the unit's edges, to line up with overlay doors), and standard or full-extension runners. Fronts leave a small gap all round, so neighbouring fronts don't rub; the cut list lists the runner pairs to buy, in the longest length that fits. Drawers now sit flush with the front of the unit, and 3D shows the drawer box.

- Hinged doors: add a door from Fronts, make it single (hinged left or right) or double, and set it in front of the unit (overlay) or inside its opening (inset). Doors are see-through in the front view and 3D so you can still work on the inside, show which side they open from, and a double door's two leaves are in the cut list.

## 1.2.0 — 2026-09-28

- Drag any of several selected parts to move them all together, and nudge them together with the arrow keys. Clicking one of them without dragging selects just that part.

## 1.1.0 — 2026-09-28

- Room Designer is now called Boardcut. Your projects and settings are kept.
- New app icon: a small wardrobe instead of the Vite logo.
- A GitHub link in the sidebar, to Boardcut's source code.
- Design wardrobes along two or three walls of a room (L- and U-shaped). Pick the layout and room size under Room, then switch between walls above the drawing. Each wall shows the walls at its ends and a faint outline of the unit on the next wall, parts that run into each other in a corner turn red, and Top and 3D show the whole room.

## 1.0.0 — 2026-09-26

The first release.

- Design wardrobes, closets and shelving in a front view, from side, top/bottom and back panels, plinths, rails, shelves (fixed or adjustable), dividers, hanging rods and drawers.
- Add a whole box (sides, top, bottom and back) sized as one, and resize it by dragging its handles.
- Look at the unit from the left, right, top or back, or orbit around it in 3D.
- Board thickness and unit depth are project settings; every panel follows the thickness.
- Dimension lines for the overall size and the gaps around the selected part, and hanging guides that check whether shirts and coats fit below a rod.
- Overlapping parts are shown in red.
- A cut list of every board to cut, with identical parts counted together.
- Colour parts one by one or several at once, and choose a colour for new parts.
- Select several parts with ⌘/Ctrl-drag or ⌘/Ctrl-click; copy and paste parts, also between projects.
- Undo and redo, and keyboard shortcuts for everyday actions (see Shortcuts).
- Several projects, autosaved in the browser, with thumbnails; rename, duplicate and delete them.
- Save a project to a file and open it again, as a new project or over the current one.
- Show lengths in mm, cm, m or inches.
- Runs entirely in the browser, with no account or server; can be self-hosted as a static site.
