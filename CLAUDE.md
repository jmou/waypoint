# Waypoint — Implementation Handoff

## What is this

Waypoint is a collaborative travel planning app. Think Notion meets Google Maps — a notes-first editor where places and experiences are structured entities that appear as interactive chips in prose, with synchronized views for maps, schedules, and expenses.

This document captures all design decisions, interaction patterns, and implementation specs from several iterative design sessions. The codebase has a working foundation (entity model, stores, TipTap editor with chips and slash commands). Your job is to build it out into a fully functional app.

## Reference mockup

The file `two-pane-v12.jsx` in the project root is a self-contained React artifact that demonstrates the complete UI as designed. **Run it to see exactly what the app should look and feel like.** It's ~800 lines and contains every interaction pattern, visual state, and layout decision. Use it as your visual source of truth.

To view it: paste it into any React sandbox, or render it as an artifact. It uses inline styles and no external dependencies except the DM Sans Google Font.

---

## Core concepts

### Entity model

Two entity types with rigid schemas:

**Place** — something locatable.
- Has coordinates (lat/lng) or is "unlocated" (shown with "no loc" label)
- Strict tree hierarchy via `parentId` (e.g., Kyoto > Fushimi Inari)
- Places only parent to places

**Experience** — something temporal and/or costable.
- Optional schedule (date + time + timezone)
- Optional amount + currency (makes it an expense)
- `placeIds` array: many-to-many association with places
- Strict tree hierarchy via `parentId` (e.g., Trip > Fushimi hike > Fox udon ¥850)
- Experiences only parent to experiences
- "Expenses" are just experiences with a non-null `amount` — there is no separate Expense type

**Relationships:**
- Place hierarchy is a tree (single parent, children are places)
- Experience hierarchy is a tree (single parent, children are experiences)
- Experience → Place is many-to-many via `placeIds`
- These cross-type relationships drive the highlighting system

### Entity chips

Entities appear as inline chips in the notes editor and throughout the UI. Chips are color-coded: **red (#a33d22) for places**, **blue (#2d5f82) for experiences**.

Chip anatomy (left to right):
- **Place chips**: `[pin icon | name]` — vertical rule separates the pin from the name
- **Experience chips**: `[name | pin? | clock? | ¥amount?]` — indicators appear with dividers when the experience has an associated place, schedule, or amount

Each indicator section is independently clickable and navigates to the relevant view:
- Pin icon on a place chip → selects the place + opens Map view
- Pin icon on an experience chip → selects the experience (not the place) + opens Map view
- Clock icon → selects the experience + opens Schedule view
- Amount → selects the experience + opens Expenses view
- Clicking the name → just selects the entity (no navigation)

### Selection vs highlighting

This is a critical distinction:

**Selected** = entities the user explicitly clicked. Visual: **solid colored background with white text** (inverted). Like the filled map pins.

**Highlighted** = entities derived from the selection via relationships. Visual: **semi-transparent colored background with visible colored border**. More noticeable than default but clearly secondary to selection.

`computeHighlighted()` rules:
- Selected entity's descendants → highlighted
- Selected experience's associated places → highlighted
- Selected place's associated experiences (including at child places) → highlighted
- Selected entities themselves are never in the highlighted set

Modifier key behavior:
- Plain click: replace selection with single entity (clicking same entity again deselects)
- Ctrl/Cmd+click: toggle entity in/out of multi-selection
- Day header click in schedule: select all experiences on that date (plain=replace, Ctrl=add)

### Selection popover

Fixed at bottom-center of screen. Appears when anything is selected.
- Shows entity chips (same style as notes chips, with pin/clock/amount indicators)
- Chips are in selected (inverted) state
- Clicking a chip in the popover deselects it (always acts as Ctrl+click)
- × button at the right end clears all selection
- No count label — just the chips themselves
- Max 8 chips shown, then "+N more" text

---

## Layout

Two-pane layout with a title bar:

```
┌─────────────────────────────────────────────┐
│  Kyoto · March 2026                [K] [M]  │ ← title bar
├──────────────────────┬──────────────────────┤
│ Map│Schedule│Expenses│ Notes│Places│Experiences│ ← tab bars
├──────────────────────┼──────────────────────┤
│                      │                      │
│   Left pane          │   Right pane         │
│   (visualization)    │   (authoring)        │
│                      │                      │
├──────────────────────┴──────────────────────┤
│         [selection popover chips] [×]        │ ← fixed bottom
└─────────────────────────────────────────────┘
```

Left pane tabs: **Map**, **Schedule**, **Expenses**
Right pane tabs: **Notes**, **Places**, **Experiences**

Both panes are flex: 1 (equal width). Left has a right border.

---

## View specifications

### Notes view (RIGHT PANE) — PARTIALLY IMPLEMENTED

The core authoring surface. TipTap editor with:
- Georgia serif for prose, DM Sans for UI elements
- Entity chips inline in text (see chip anatomy above)
- Paragraph blocks highlight when they contain selected or highlighted entities (left border + background tint)
- **Slash commands**: typing `/` opens a popover prioritizing "Not yet mentioned" entities, then "Already mentioned," then "Create new Place/Experience"
- Collaborator cursor (colored bar + name label) shown at edit position

**Current state**: TipTap is wired with EntityChipExtension and SlashCommandExtension. Seed document loads with chips. The chip node view reads from the Zustand store and renders reactively.

**Still needed**: 
- Chip node view needs full visual treatment from the mockup (the current ChipExtension.tsx renders with CSS classes; it needs the inverted selection state, highlight state, clickable indicator sections with hover effects, and the vertical rule on place chips)
- Paragraph-level highlighting (detect which paragraphs contain selected/highlighted chip nodes, apply background + left border)
- Wire chip indicator clicks to actually call `onNavigate` and switch tabs

### Map view (LEFT PANE) — NOT IMPLEMENTED

Shows entity pins on a map.

- Use Leaflet or Mapbox GL JS
- Pins for all places that have coordinates
- Pin label shows place name
- Pin visual states: default (white bg), selected (filled accent color, white text, glow shadow), highlighted (tinted bg, colored border)
- Clicking a pin → selects the place
- **Unlocated places footer**: semi-transparent bar at the bottom of the map listing places with no coords as small chips. These are interactive (clickable to select).
- Map should pan/zoom to show all pins with reasonable padding

### Schedule view (LEFT PANE) — NOT IMPLEMENTED

Chronological list of experiences grouped by date.

**Date range header** at top: "Schedule: `Mar 15` — `Mar 19`". Clicking either date opens a mini calendar (March 2026) to adjust the range. The calendar shows dots on dates that have scheduled experiences, fills the current selection blue.

**Timezone indicator**: Below the first day header, show "🌐 Asia/Tokyo (UTC+09:00)". Clicking opens a timezone picker dropdown.

**Day groups**: Each date shows:
- Day header: "Mar 15 · Saturday" (clickable for day-selection)
- Experience rows within that day, sorted by time
- Each row: `[clock + time | name | place | cost]`
- Time is inline-editable (click to turn into text input, Enter/blur commits)
- Rows are draggable between dates (HTML5 drag-and-drop). Drop target dates highlight on dragover.
- "+ Add or link experience..." prompt at the bottom of each day

**Unscheduled section** at the bottom: experiences with no schedule and no amount (not structural containers). Shows "drag to schedule" in the time column. These are also draggable.

Selection/highlighting applies to experience rows with the same inverted/tinted treatment as everywhere else.

### Expenses view (LEFT PANE) — NOT IMPLEMENTED

Filtered list of experiences where `amount != null`.

- Each row: `[name, "in {parentName}" | amount]`
- Amount is inline-editable (click to turn into text input)
- While editing, clicking the currency symbol (¥, $, €, etc.) opens a currency picker dropdown (JPY, AUD, USD, EUR, GBP)
- "+ Add expense..." row at the bottom
- **"Highlighted" subtotal**: sum of amounts for selected + highlighted expenses, shown above the total. Only appears when there are active expenses. Label says "Highlighted" (not "Selected"). Formats as multi-currency if needed: "¥3,200 + $120"
- **Total**: sum of all expenses, multi-currency format: "$120 + ¥111,400"
- Selection/highlighting with inverted/tinted row treatment

### Places view (RIGHT PANE) — NOT IMPLEMENTED

Tree hierarchy of places.

- Expandable/collapsible nodes with ▶ toggle
- Each row: `[pin icon | name | "no loc"?]`
- Drag-and-drop for reparenting (visual feedback on drag, drop zones between/on nodes)
- Inline add row at each level: "+ Add place..."
- Row visual states: default, selected (filled accent, white text/icon), highlighted (tinted bg, colored border)
- Clicking a row selects the place

### Experiences view (RIGHT PANE) — NOT IMPLEMENTED

Tree hierarchy of experiences.

- Same expand/collapse and drag-and-drop as Places
- Each row: `[dot/¥ indicator | name | place | schedule | cost]`
  - Dot indicator (small blue circle) for non-expense experiences
  - ¥ indicator for expenses
  - Place shown as: pin icon + place name (in accent color)
  - Schedule shown as: clock icon + formatted date
  - Cost shown for parent nodes as aggregated subtree cost
- Inline add row at each level: "+ Add experience..."
- Same selection/highlighting treatment as all other views

---

## Visual design system

### Colors

```
Background:        #f8f7f5
Surface:           #ffffff
Surface alt:       #f0efec
Border:            rgba(0,0,0,0.09)
Border strong:     rgba(0,0,0,0.16)
Text:              #1a1917
Text muted:        #555249
Text dim:          #8a8680

Place accent:      #a33d22
Experience blue:   #2d5f82
Blue text:         #1e4a6a

Highlight bg (exp):    rgba(45,95,130,0.08)
Highlight border (exp): rgba(45,95,130,0.28)
Highlight bg (place):  rgba(163,61,34,0.06)
Highlight border (place): rgba(163,61,34,0.22)
```

### Typography

- UI: DM Sans (400, 500, 600, 700)
- Notes prose: Georgia serif
- Font sizes: 9-14px range. UI labels 9-12px. Notes prose 14px. Title 17px. Section headers 12px.

### Selection states (consistent across ALL views)

**Default**: transparent or `${color}05` background, `${color}10` border (1px)
**Highlighted**: `${color}12` background, `${color}50` border (1.5px) — for chips. Row items use the highlight bg/border constants above.
**Selected**: solid `${color}` background, white text, `${color}` border (1.5px) — fully inverted. All sub-elements (icons, amounts, metadata) also go white/translucent-white.

### Chip dividers

Inside chips, indicator sections are separated by 1px vertical rules:
- Default: `${typeColor}20` 
- Selected: `rgba(255,255,255,0.25)`
- Each indicator section has independent hover: opacity increases, subtle background appears

---

## Current codebase

### What exists and works

```
src/entities/
  types.ts       — Place, Experience, Trip, Currency types, factory functions
  helpers.ts     — getDescendants, getChildren, computeHighlighted, getSubtreeCost,
                   aggregateCosts, getExperiencesForDate, getUnscheduledExperiences, etc.
  store.ts       — Zustand store: CRUD for places/experiences, hydrate, reparent
  selection.ts   — Zustand store: click/toggle/handleClick/selectMany/handleDayClick/clear
  seed.ts        — Full Kyoto trip (9 places, 22 experiences) + TipTap document JSON
  index.ts       — Barrel export

src/editor/
  ChipExtension.tsx  — TipTap atom node, ReactNodeViewRenderer, reads store
  SlashCommand.tsx   — ProseMirror plugin, floating popover, entity search + create
  NotesEditor.tsx    — Editor component wiring extensions + store
  index.ts           — Barrel export

src/liveblocks/
  config.ts      — Placeholder (commented out client setup)

src/App.tsx      — Two-pane shell, tab routing, hydration, placeholder views
src/styles.css   — Design tokens as CSS custom properties, chip/editor/layout styles
src/main.tsx     — React entry point
```

### What needs work in existing code

1. **ChipExtension.tsx**: The React node view renders basic HTML with CSS classes. It needs the full interactive treatment:
   - Vertical rule between pin icon and name on place chips (separate click zones)
   - Hover effects on each indicator section (opacity + subtle background)
   - Inverted colors when selected (white text, white icons, white dividers)
   - Highlighted state (stronger border + tinted background)
   - Actually call `onNavigate` when indicator sections are clicked (currently the extension accepts the option but the node view doesn't use it — needs a React context or prop drilling solution since node views don't have direct access to extension options)

2. **SlashCommand.tsx**: Works but the popover positioning could be improved (currently uses `view.coordsAtPos` which can be off). Consider using a React portal with `useFloating` from `@floating-ui/react` for robust positioning.

3. **styles.css**: Has CSS classes for chip states but they need to match the mockup exactly. The inline-style approach from the mockup may be more reliable than CSS classes for the chip node view.

4. **App.tsx**: Selection popover exists but uses simplified chips (just colored spans). Should use the same Chip component as notes.

---

## Implementation priorities

### Phase 1: Get the notes editor visually correct

1. Build a shared `<Chip>` React component matching the mockup exactly (the `Chip` function in `two-pane-v12.jsx`). This component is reused everywhere — notes, popover, map footer, slash command results.

2. Update `ChipExtension.tsx` to use this shared Chip in its node view. Solve the onNavigate problem (React context for navigation callbacks, or a global event bus).

3. Add paragraph-level highlight detection: walk the editor state to find which paragraphs contain selected/highlighted entity chips, apply the `notes-block--has-selected` / `notes-block--has-highlighted` styles.

4. Update the selection popover in App.tsx to use the shared Chip component with full indicators.

### Phase 2: Places and Experiences tree views

5. Build `PlacesView` — recursive tree renderer using `getRoots("place")` + `getChildren()`. Each node uses a line-item component (see `PlaceLineItem` in the mockup) with the same selection/highlight treatment.

6. Build `ExperiencesView` — same recursive pattern with richer metadata per row (place, schedule, cost). Use `getSubtreeCost` for parent nodes.

7. Add drag-and-drop reparenting to both trees. On drop, call `store.reparent(id, newParentId)`.

8. Add inline add rows at each hierarchy level. On submit, call `store.addPlace` or `store.addExperience` with the appropriate parent.

### Phase 3: Schedule view

9. Build the schedule view with date-grouped experience rows. Use `getExperiencesForDate` for each date in the trip range.

10. Add inline time editing (click time → text input → blur/enter commits via `store.updateExperience`).

11. Add drag-and-drop between dates. On drop, update the experience's `schedule.date`.

12. Add the date range header with mini calendar pickers for start/end dates.

13. Add the timezone indicator with picker.

### Phase 4: Expenses view

14. Build filtered expense list. Use `entities.values()` filtered to `amount != null`.

15. Add inline amount editing with currency picker.

16. Add multi-currency totals and highlighted subtotal.

### Phase 5: Map view

17. Integrate Leaflet or Mapbox. Render pins for located places.

18. Add selection/highlight states to pins matching the mockup.

19. Add the unlocated places footer bar.

20. Pan-to-fit on load and when selection changes.

### Phase 6: Liveblocks integration

21. Set up Liveblocks client with `createClient({ publicApiKey })`.

22. Sync entity store: mirror `EntityMap` to `LiveMap<EntityId, LiveObject<Entity>>`. On local mutation → update LiveMap. On remote LiveMap change → update Zustand store.

23. Connect TipTap to Liveblocks Yjs provider for collaborative document editing.

24. Add presence (cursors, selection broadcasting).

---

## Technical notes

### State management pattern

All entity data lives in the Zustand `useEntityStore`. All derived data (descendants, costs, highlights) is computed via pure functions in `helpers.ts` — never stored. This keeps the store simple and avoids stale derived state.

Selection lives in a separate `useSelectionStore` to keep concerns clean. Components that need highlighting call `computeHighlighted(entities, selected)` in render.

### Mutations are discrete operations

Every store mutation (add, update, remove, reparent) is a single atomic operation that produces a new Map. This design is intentional — each mutation maps directly to a Liveblocks Storage operation, making sync straightforward.

### Entity IDs

Using `crypto.randomUUID()` (browser native). Seed data uses readable IDs like `p-kyoto` and `e-fushimi-hike` for debugging.

### No backend yet

Everything runs client-side. The Liveblocks integration (Phase 6) is the sync/persistence layer. Until then, data resets on reload (seeded from `seed.ts`).

### Dependencies

Currently in package.json:
- React 18, Vite 6, TypeScript 5
- TipTap (core, react, starter-kit, pm, collaboration extensions)
- Zustand 5
- Liveblocks (client, react, react-tiptap, yjs) — installed but not yet used
- Yjs — installed but not yet used

Will need to add:
- `leaflet` + `react-leaflet` (or `mapbox-gl` + `react-map-gl`) for the map view
- Possibly `@floating-ui/react` for better popover positioning
- `@dnd-kit/core` + `@dnd-kit/sortable` if HTML5 drag-and-drop proves insufficient

---

## Key interaction patterns to get right

1. **Clicking a place pin icon on a chip always opens the map.** On a place chip, it also selects that place. On an experience chip, it selects the *experience* (not the place).

2. **Selection is consistent everywhere.** Click an entity in the notes, the places tree, the schedule, the expenses, or the map — same entity gets selected, same highlights appear across all views simultaneously.

3. **Inline editing pattern**: click a value (time, amount) to turn it into an input. Input is focused immediately. Enter or blur commits. Escape cancels. The value shows a subtle hover state (background change) to indicate editability.

4. **Day selection in schedule**: clicking a day header selects ALL experiences on that date. With Ctrl held, it adds them to the current selection. This must be atomic (one state update, not looping through individual selects).

5. **Drag-and-drop** is primarily for reparenting (trees) and rescheduling (schedule). Visual feedback: the drop target highlights. The drag source shows a grab cursor.

---

## Style of implementation

- Functional React components with hooks throughout
- TypeScript strict mode, but pragmatic — `noUnusedLocals: false` to avoid friction during development  
- Prefer inline styles for dynamic state-driven styling (selection/highlight). Use CSS for static layout.
- No component library — everything is custom-styled to match the design system
- Keep components small and composable. The `Chip` component is shared across notes, popover, map footer.
- Test with the seed data. Every interaction should work with the Kyoto trip graph.
