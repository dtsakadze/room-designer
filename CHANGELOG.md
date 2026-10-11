# Changelog

What changed in each release, newest first. The app shows this file in its "What's new" panel, so write for people using the app, one line per change, and keep the format: a `## <version> — <date>` heading, then `- ` lines.

## Unreleased

## 1.13.0 — 2026-10-11

- In an L- or U-shaped room, a door that would swing into the front panel of a set of sliding doors on another wall is now flagged. Only the back panel was checked before, so it could go unnoticed.
- In a room with side walls, sliding doors on a neighbouring wall now show their full depth (both panels) where that wall's parts are outlined faintly in a corner, and the 3D view frames them in full.

## 1.12.0 — 2026-10-11

- Tidier sidebar header: the project's name sits at the top with a File menu beside it (Projects, Open file, Save to file, Print), replacing the Projects button and the File section. "Saved" shows as one word next to the app name, the version and What's new moved to the bottom of the sidebar with a labelled GitHub link beside them, and Room now comes first, before Add. The warning that the browser may clear projects when disk space runs low is now in the File menu, next to Save to file, instead of always on screen.
- Settings moved out of the sidebar into their own window: click the gear next to File. Pages on the left: Boards, Look, Construction (joints and shelf pins), New parts, and This browser (units and hanging guides). Each board is one line with its thickness and material; click it to see the rest. The colour and depth new parts start with are both under New parts, and a line under the Add buttons shows them, with a Change link.
- A more compact Add section: each add button has a small picture of the part and sits two to a row, Box leads at the top, your saved blocks come right after it, and the groups are Panels, Inside, Fronts and trim, and Accessories. A block's Rename and Delete are behind its ⋯ button. The sidebar is a little wider so every name fits.
- Shorter warnings in Parts: one line per kind of problem (overlapping parts, shelves that span too far, parts past a wall, drawers too close behind a door). Click one, or its Show link, to select the part it's about; click again for the next one, switching walls if needed. Clear all is now a small Clear all parts link under the list.
- The Room section's notes are shorter, and its size fields say which walls they measure: Width (back wall) and Depth (side walls).
- Tidier Selected panel (right of the drawing), short enough to fit on screen for every part: the part's name sits at the top with Duplicate, Save as block and Delete as small buttons that stay in view. Any problem with the part comes next, then its size and position, three fields to a row, then its own options (Door, Drawer, Shelf…) in a foldable group, and its colour, edge banding and grain under Finish, folded. Choices are one row each; the handle, drawer closing and accessory type are dropdowns. Long explanations are behind a small i next to the option, and worked-out numbers (hinges, front and box size, runners) are short lines under the options. Fit between sides is a clear button under the size, saying when there are no sides to fit between. A shelf's Fixed is now a Type switch (Adjustable or Fixed), and Z shows "auto" until you type one, with a "Z to auto" link to undo that.
- The cut list opens as a large view over the drawing instead of a small box: totals at the top (boards to cut, sheets, edge banding, hardware), the boards table on the left with the edge banding and hardware beside it, and the sheet layouts drawn bigger, side by side. Whole room or By wall is a switch at the top, next to the CSV downloads and a new Print button. Esc or × goes back to the drawing.
- Works on phones and tablets: the drawing gets the whole screen. Tap ☰ (top left) for the sidebar; it closes by itself once you add or pick a part. Selecting a part slides its panel in from the right, or up from the bottom on a phone held upright, where ⌄ folds it down to see the drawing and × closes it. Pinch with two fingers to zoom, drag to pan. On a phone held upright a note suggests turning it sideways for more room. Desktop looks as before.
- A damaged or hand-edited project file can no longer crash Boardcut every time it opens: parts with an unknown kind are now dropped when the file is read.
- Sizes and positions now stop at 50 m and board thickness at 100 mm, so a damaged file or a mistyped huge number can no longer freeze the page. A file with more than 5,000 parts is shown as "Can't open" instead.
- Keys no longer change the drawing behind a dropdown or an open window: Backspace in a dropdown such as Handle, or with Print, Settings or the cut list open, used to delete the selected part, and the arrows moved it instead of changing the dropdown. ⌘A, ⌘C, ⌘V, ⌘D and M also wait until the window is closed. The Shortcuts panel still lets you try them.
- Undo in the middle of a drag no longer mixes up the history: the rest of the drag becomes its own step, and Redo can't jump back to a position from halfway through it.
- Closing Settings with Esc while a field was focused no longer makes the next changes undo together as one step.
- A number too big to be a length (such as 1e308 in cm or inches) is now ignored while you type it, instead of making the part disappear the next time the project opened, or a board thickness taking all its parts with it.
- Autosave is more careful: if a fault in the app ever left a part broken, the last good save is kept instead of being replaced by one that would open without that part.
- A damaged project file with two parts or boxes sharing an id now opens with only the first of each, instead of deleting or moving both together and leaving stray lines on the drawing.
- With Boardcut open in two tabs, each tab now follows what the other saves: a project changed in one tab shows the change in the other instead of being saved over by it, a project deleted in one tab no longer comes back from the other, and new or renamed projects show in both lists.
- A selection now stays on one wall: ⌘-clicking a part on another wall in the Parts list starts a new selection there, so Delete, copy or a move can no longer reach a part on a wall you aren't looking at. In the Top view, which shows the whole room, you can still select parts on several walls; going back to a wall keeps only the ones on it.
- Undoing a move to another wall now takes the view back to that wall with the part, instead of leaving it selected but out of sight.
- If the 3D view can't start (a browser or computer without 3D graphics, or no connection when it first loads), it now says so with a Try again button, and the rest of Boardcut keeps working, instead of the whole app showing "Something went wrong".
- Fit between sides on an overlay drawer now covers only half of a divider, so the drawers in the bays either side of it meet in the middle instead of overlapping by most of the divider (and the cut list no longer asks for fronts that can't both fit). A side panel's edge is still covered all the way.
- Printed drawings measure the right openings when the dividers above a shelf aren't in line with the ones below it: each opening gets its own width and heights, and an opening that starts higher up has its width written inside it. Before, the widths were worked out between neighbouring dividers as if they all ran full height, which gave openings that don't exist.
- Hanging rods now hang halfway between the back and the front of the unit in the side, top and 3D views and the clash check, where hangers fit, instead of against the back panel. A Z you typed yourself is kept.
- Cut list CSV downloads are safer to open in Excel or Google Sheets: a board name starting with =, +, - or @ (which a spreadsheet would run as a formula) now gets a ' in front, so it shows as plain text.
- Export view works for a project whose name has a non-breaking space in it (Option+Space on a Mac, or pasted from a web page): the SVG used to be a broken file and the PNG silently didn't download. If a PNG ever can't be made, you're now told so.
- Duplicating a box (⌘D, or Duplicate in the Selected panel) now keeps its panels' colours, edge banding and grain, as pasting it already did, instead of giving the copy plain panels or the new-part colour.
- Pasted adjustable shelves, and those in a block you insert, now sit on the shelf-pin holes of the project they land in, even when its hole spacing differs from where they came from.
- A drawer can't be made shallower than its front plus a drawer box behind it (37 mm with standard 18 mm boards). Shallower ones used to get a front sticking into the wall and a box shorter than its own back board in the cut list, the 3D view and the clash check.
- An adjustable shelf above a short divider now rests on the holes of the full-height side at its other end, instead of jumping down to the divider's holes, and holes are no longer drawn on the divider for it.
- The hardware list no longer counts too many fixings: a unit whose sides go down to the floor gets no adjustable feet just because a divider stands on its raised bottom, and a middle board with a divider under it no longer counts as a unit's top (which doubled the anti-tip brackets and wall anchors).
- Double door leaves and sliding door panels are now whole millimetres, rounded down, so the cut list sizes always fit: a 1200 mm double door's leaves are 598 each instead of 599, which made the pair 1 mm wider than the door. The end panels of a sliding set stay flush with its ends.
- A very narrow set of sliding doors (narrower than the overlap between its panels) no longer draws its panels sticking out to the left of the set; the overlap shrinks to fit.
- Typing a length with a thousands comma, like 1,200 in millimetres, now gives 1200 mm instead of 1.2 mm. A comma still works as a decimal point where that's what it must mean, like 116,4 in centimetres.
- The note about glass and mirror pane thickness in the Selected panel now uses your chosen units, instead of always saying mm.
- Printing from the browser's own menu (instead of Boardcut's File → Print…) no longer gives a blank page: it prints a short note saying where to print from.
- Windows (Settings, Projects, Print, What's new, Open file) work better from the keyboard: they take the focus when they open, Tab stays inside them, focus goes back to where it was when they close, and Esc closes only the one on top, so Print opened over Settings no longer closes both.
- A drag can no longer get stuck: if the mouse button is let go somewhere Boardcut doesn't hear it (over another window, or during a system gesture), the drag ends as soon as the pointer moves again, instead of the part following the pointer with no button held.
- Right-dragging that starts on a blue resize handle now pans the drawing, as it does everywhere else, instead of resizing the part.
- Fixed a drawing glitch that could leave stray marks behind on a very narrow fixed shelf (its screw marks) or a very small set of sliding doors (its tracks and panels).
- The 3D view uses less power: it only redraws when something changes (you turn the view, or edit the design) instead of all the time, and closing it frees its graphics memory straight away, so switching to 3D and back many times no longer piles up.
- Opening a project while a new one was still being made could show one project but reopen the other after a reload. The project you picked last now wins on both counts.
- For people running their own copy with Docker: the image now runs nginx as an ordinary user instead of root, and listens on port 8080 inside the container, so use `-p 8080:8080` instead of `-p 8080:80` (`docker compose` is already updated). It also sends security headers, which Boardcut's own site now does too.
- After an update, the installed app now shows the new version's icon and app details straight away, instead of the previous version's for a while.

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
