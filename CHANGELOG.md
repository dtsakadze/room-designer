# Changelog

What changed in each release, newest first. The app shows this file in its "What's new" panel, so write for people using the app, one line per change, and keep the format: a `## <version> — <date>` heading, then `- ` lines.

## Unreleased

## 1.11.0 — 2026-10-10

- Cut list by wall: in an L- or U-shaped room, tick By wall at the top of the cut list to get a separate list for each wall (boards, edge banding and hardware), under the wall's name, so you can build and carry one run at a time. The CSV downloads then have a Wall column, and the printed cut list follows the same choice. The sheet layout still covers all the walls together, since sheets are cut whole. It's off to start, and only appears when the room has side walls.

- A warning when a part sticks out of the room: in an L- or U-shaped room, a part past either side, through the back wall (a unit on a side wall that runs into the corner), or past the front end of the side walls, or above the ceiling once you've set its height, gets an orange outline, is marked in the Parts list, and its Selected panel says how far and past what. Parts only touching a wall are fine.

- Your own blocks: select a part, a box or several parts and click Save as block…, give it a name (for example "My drawer unit"), and it appears under Add → My blocks in every project. Click a block to insert it at the right of what's on the wall you're editing (one Undo takes it back), or Rename or Delete it there. Blocks are kept in this browser.

- Resize with the keyboard: with a part selected in the Front view, ⌘ + arrow (Ctrl on Windows and Linux) resizes it by 10 mm: → wider, ← narrower, ↑ taller, ↓ shorter, with the left and bottom edges staying put. Add Shift for 100 mm. A panel of a box resizes the whole box. It's listed under Shortcuts.

- Templates: Projects → New project now asks what to start from: Blank, or a Two-door wardrobe, Sliding-door wardrobe, Bookshelf, Closet with drawers or Hall unit, each with a small preview. A template opens as a new project that you can change like any other, and nothing in it overlaps, sags or is too close to a door.

- Install it and use it offline: after the first visit Boardcut saves itself on your device, so it opens without a connection, and your browser can install it as an app (Chrome and Edge show an install button in the address bar; on an iPhone use Share, then Add to Home Screen). A new version is picked up the next time you open it with a connection, and your projects stay as they were.

## 1.10.0 — 2026-10-10

- Pull-down lifts: select a hanging rod and tick Pull-down lift for a rail too high to reach. The hardware list then has a lift for that rod (by its length) instead of the two end supports.

- Drawers behind doors: a drawer that sits too close behind a door (less than 20 mm for the hinges, plus 25 mm for a handle or knob on the drawer; 5 mm behind sliding doors) gets an orange outline, is marked in the Parts list, and the Selected panel of the drawer and of the door says how much room is missing. On the drawer, Set back behind the door moves it back by exactly that much, and shortens it if there isn't room.

- Adjustable feet: the hardware list now has adjustable feet for every unit lifted off the floor, by the height of the gap under it: two rows, front and back, with a foot at each end and one every 600 mm (4 for a 600 mm wide unit, 6 for a 1200 mm one). A unit standing straight on the floor, or hung more than 300 mm up, gets none.

- Accessories: Add → Accessories has a Pull-out trouser rack, Tie and belt rack, Pull-out wire basket, Pull-out shoe rack and Angled shoe shelf. Each starts at a usual size, sits at the front of your unit, has a tint of its own and its name written on it, and is drawn with simple lines (bars, hooks, a wire grid or slats); change its type, size and position in the Selected panel. They're bought as one fitting, so the hardware list has each by type, width and depth, and they aren't in the cut list.

## 1.9.0 — 2026-10-09

- Looks to try in one click: Settings → Boards → Look has Standard (no colours and no grain, as a new project starts), Oak and white, All white, All black, Walnut and grey, Light oak all over, and Grey melamine with oak fronts. A look sets the colour and edge banding of every board and which boards have a grain; Undo brings back the old one. Parts you coloured yourself keep their colour unless you tick Also reset parts I coloured myself.

- Sheet layout, if you want it: under Settings → Boards, each board is either Cut to size (the default: you order the pieces from the cut list) or Whole sheets, with its sheet length, width and saw cut. A board bought as whole sheets gets a Sheet layout in the cut list: each sheet drawn to scale with its parts placed on it, how many sheets you need and how much is waste. Parts on a board with grain aren't turned, and parts too big for the sheet are listed.

- Wood grain is drawn: on the boards marked as having a grain (Settings → Boards → Grain), parts show fine grain lines in the front, side, back and top views and a wood texture in 3D, running the way each part's grain runs (turn a part's grain in its Selected panel). Where the grain runs into the face, as on the ends of a board, there are no lines.
- Glass and mirror doors: select a door or a set of sliding doors and pick Panel: Glass or Mirror. They're drawn light blue or silver with a shine in the flat views, and see-through (glass) or shiny (mirror) in 3D. Panes are 4 mm thick and bought to size, so they're in the hardware list (one pane for each leaf or sliding panel), not the cut list, and have no colour or edge banding.

- What opens a door or drawer: select one and pick Opened with: Handle or knob (as before), Bar handle, Knob, J-profile grip, Push-to-open (hinged doors; a drawer's push-to-open is under its runners) or None. The hardware list counts each kind, and gives J-profile cut to the length of every front that has one. Nothing is drawn on the front.

- Anti-tip brackets and wall anchors: the hardware list now has two anti-tip brackets for every unit taller than 700 mm (a box, or a carcass built from loose panels, counted by its top board), and a wall anchor with its screw for each bracket. Which anchors to buy depends on your wall.

- Joints: choose how the carcass is put together under Settings → Boards → Joints: Screws (as before), Confirmat screws, or Cam locks and dowels. The hardware list counts what goes with it for the carcass joints and fixed shelves: confirmat screws, or cam locks, cam bolts and dowels (typical numbers, not exact). Nothing is drawn on the parts.

- Shelf span warnings: a shelf wider than its board can span without sagging gets an orange outline, is marked in the Parts list, and the Selected panel says what the limit is. The limit comes from the new Material choice under Settings → Boards (Chipboard, MDF, Plywood or Solid wood) and the board's thickness, so a thicker or stiffer board spans further. The limits are rules of thumb for clothes and folded things; heavy loads such as books need less.
- Hanging rods longer than they can carry (1200 mm for a 25 mm rod) get centre support brackets: the Selected panel says how many, and the hardware list has them as Rod centre support brackets.

## 1.8.0 — 2026-10-08

- Front-to-back position: every part and box has a Z field in the Selected panel (how far its back face is from the wall). It's automatic until you type a number, and Reset to automatic goes back. The side, top and 3D views and the clash check use it, so you can set a shelf back from the front or pull a door forward. A box's Z moves its sides, top, bottom and back together; parts inside it keep their own.
- Sliding doors now show their two lanes in the side, top and 3D views: the front panels stand in front of the back ones, and overlapping panels no longer count as a clash.

- Cornice and filler strips: Add → Trim has a Cornice (a board across the top front, placed on top of your unit and as wide as it) and a Filler strip (a narrow board to close the gap to a wall). Size and move them like any part; they're listed in the cut list under Trim and fillers.
- Ceiling height: switch on Show the ceiling in the Room section to draw a dashed ceiling line in the front view, with how far it is above the highest part (in red if the unit is too tall). Select a filler strip or cornice and click Up to the ceiling to make it reach.

- Sliding doors: click Sliding doors under Add → Fronts to add a set of 2 to 4 panels in tracks along the top and bottom. Pick the number of panels and how far they overlap in the Selected panel; the front view draws the tracks and the overlapping panels. The cut list has the panels, and the two tracks (cut to the set's width) under Hardware. A hinged door can be switched to sliding and back there too.

- Hanging guides are adjustable: under Settings → Hanging guides, change how far each line hangs below a rod, rename it, add or remove lines, or untick Show to hide them.

## 1.7.0 — 2026-10-04

- The up and down arrow keys step the number in any size or position field: 1 mm at a time (0.01 in inches), or ten times that with Shift.
- Board colours: give each board a colour under Settings → Boards, and every part cut from it shows in that colour, on the canvas, in 3D and in the project list (for example white carcass, oak fronts). A part you've coloured yourself keeps its own colour; Reset brings it back to its board's.
- Edge banding colours: set an Edge banding colour on a board, and its banded edges show in it wherever they face you (the front edges of the sides and shelves from the front, and in 3D).
- Measure: click Measure (or press M), then click two points to see the distance between them, with its horizontal and vertical parts for a slanted line. Points catch on the corners, edge middles and edges of parts, so you measure board to board; hold Alt to place them freely. Esc clears the measurement, and again turns the tool off. Works in every flat view.
- Snap to the middle: drag a part near the middle of its space (a divider between two sides, a shelf between the floor or a shelf below and one above) and it snaps there exactly, with a dashed line and "=" on the two equal gaps. Keep dragging to place it anywhere else.
## 1.6.0 — 2026-10-04

- Export view: a button next to Fit view saves the view you're on (Front, Left side, Right side, Top or Back) as a clean drawing with its dimensions, the same as its printed page, as an SVG (for drawing programs) or a PNG image.
- Esc also closes the shortcuts list.
- The cut list and the shortcuts list no longer open on top of each other: opening one closes the other.
- Download the cut list and the hardware list as CSV files, for a spreadsheet, a board shop or a cutting optimiser: open the Cut list and click Cut list or Hardware next to Download CSV. Sizes are in the units you've chosen.
## 1.5.0 — 2026-10-04

- Print drawings and the cut list: Sidebar → File → Print… (or ⌘P / Ctrl+P). You get a page each for the front, side and top, drawn to scale with the overall sizes, the openings between the sides and the heights inside them, and a title block, then the cut list and hardware. Choose A4 or A3, which pages, and Lines only for drawings without any shading (to save ink); pick Save as PDF in the print dialog for a PDF.
- The cut list's Hardware section now counts carcass screws (where tops, bottoms and rails meet the sides), nails or screws for the back panels, and handles or knobs: one per door leaf and drawer. Push-to-open drawers need none, and you can take the handle off any door or drawer: select it and untick Handle or knob.
- Drawers can have soft-close or push-to-open runners: select a drawer and choose under Closing. The cut list's Hardware section lists them apart from ordinary runners.
- Hinges: the cut list's Hardware section counts the cup hinges each door needs (more on taller doors), by kind: full overlay, half overlay (two doors on one side panel) or inset. Select a door to choose how far it opens (110°, 155° or 170°) and soft-close hinges; the Top view's swing and the "hits the wall" warning follow the angle.
- The cut list's Hardware section counts screws for fixed shelves too: four per shelf, two through each side.
- Fit between sides: select a shelf, top or bottom, plinth, rail, drawer or hanging rod and click Fit between sides to make it fill the gap between the side panels (or dividers) next to it, exactly to the mm. An overlay drawer is sized to cover both sides.
- Press Esc to deselect whatever is selected. With a dialog or the cut list open, Esc closes that instead.
- Edge banding in the cut list: an Edges column sketches which edges of each board to band, and a new Edge banding section adds up how much each board needs. Parts start with the edges that show (the front edge of panels and shelves, all round on doors and drawer fronts); select a part to tick other edges. For a box, select one of its panels.
- Adjustable shelves sit on shelf pins: they snap to the pin holes in the sides (32 mm apart), the holes show on the sides (as dots in the Left side and Right side views, small ticks from the front), and the arrow keys move a shelf one hole at a time. Change the spacing under Settings → Shelf pins. Fixed shelves still go anywhere. The cut list's Hardware section counts four pins per adjustable shelf.
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
