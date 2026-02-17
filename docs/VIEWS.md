# Views

## Layout

Waypoint uses a two-pane layout with separate tab bars:

```
┌─────────────────────────────────────────────┐
│  Kyoto · March 2026                         │ ← title bar
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

**Left pane:** Visualization and scheduling
- Map
- Schedule
- Expenses

**Right pane:** Authoring and hierarchy
- Notes
- Places
- Experiences

Both panes are equal width (flex: 1). The left pane has a right border.

## Notes View (RIGHT PANE)

The core authoring surface. See `docs/EDITOR.md` for full details.

**Features:**
- TipTap rich text editor
- Entity chips inline in prose
- Slash commands for entity search/creation
- Paragraph-level highlighting
- Collaborative cursors (when PartyKit enabled)

**Typography:**
- Prose: Georgia serif, 14px
- UI elements: DM Sans

**Interactions:**
- Click chip → select entity
- Ctrl+click chip → toggle multi-selection
- Click chip indicator (pin/clock/amount) → select + navigate to view
- Type `/` → open entity search

## Places View (RIGHT PANE)

Hierarchical tree of all places.

**Structure:**
- Expandable/collapsible tree nodes
- Each row: `[pin icon | name | "no loc"?]`
- Indent indicates depth
- ▶/▼ toggle for expand/collapse

**Features:**
- Click row → select place
- Ctrl+click → multi-select
- Drag-and-drop reparenting
- Inline add rows: "+ Add place..."

**Visual states:**
- Default: light background
- Selected: solid red background, white text
- Highlighted: tinted red background, colored border

**Metadata displayed:**
- Pin icon (always present)
- "no loc" label if coords are null

## Experiences View (RIGHT PANE)

Hierarchical tree of all experiences.

**Structure:**
- Expandable/collapsible tree nodes
- Each row: `[indicator | name | place? | schedule? | cost?]`
- Indicator:
  - `¥` for expenses (amount != null)
  - `•` for non-expenses

**Features:**
- Click row → select experience
- Ctrl+click → multi-select
- Drag-and-drop reparenting
- Inline add rows: "+ Add experience..."

**Visual states:**
- Default: light background
- Selected: solid blue background, white text
- Highlighted: tinted blue background, colored border

**Metadata displayed:**
- Associated place (pin icon + name, in accent color)
- Schedule (clock icon + formatted date)
- Cost (for parent nodes: aggregated subtree cost)

## Map View (LEFT PANE)

Interactive map showing place locations using MapLibre GL JS.

**Features:**
- Pins for all places with coordinates
- Pin labels show place name
- Click pin → select place
- Ctrl+click → multi-select places
- Unlocated places footer with clickable chips

**Visual states:**
- Default: white label background
- Selected: accent `#a33d22` background, white text, glow shadow
- Highlighted: tinted `#e8d4cc` background, accent border

**Controls:**
- Zoom in/out buttons (top-right)
- Pan/drag to explore
- Auto-fit bounds on load

**Unlocated footer:**
- Semi-transparent bar at bottom
- Shows chips for places without coordinates
- Same selection behavior as map pins

**See [docs/MAP.md](./MAP.md) for complete details:** pin rendering, MapLibre integration, pan-to-fit, testing, performance.

## Schedule View (LEFT PANE)

Chronological list of experiences grouped by date.

### Date Range Header

At top: "Schedule: `Mar 15` — `Mar 19`"

- Click either date → opens mini calendar
- Calendar shows dots on dates with scheduled experiences
- Selected dates shown in blue

### Timezone Indicator

Below first day header: "🌐 Asia/Tokyo (UTC+09:00)"

- Click → opens timezone picker dropdown
- Changes timezone for all scheduled experiences

### Day Groups

Each date shows:
- Day header: "Mar 15 · Saturday" (clickable for day-selection)
- Experience rows sorted by time
- "+ Add or link experience..." prompt at bottom

**Day header interaction:**
- Plain click: select ALL experiences on that date
- Ctrl+click: add all experiences on that date to selection

### Experience Rows

Format: `[clock + time | name | place | cost]`

**Time editing:**
- Click time → turns into text input
- Enter or blur → commits change
- Updates experience.schedule.time

**Drag-and-drop:**
- Rows are draggable between dates
- Drop target dates highlight on dragover
- Drop updates experience.schedule.date

### Unscheduled Section

At bottom: experiences with no schedule and no amount (not structural containers).

- Shows "drag to schedule" in time column
- Draggable to date groups
- Drop sets schedule.date and default schedule.time

### Selection/Highlighting

Same visual treatment as other views:
- Selected: solid blue background, white text
- Highlighted: tinted blue background, colored border

## Expenses View (LEFT PANE)

Filtered list of experiences where `amount != null`.

### Expense Rows

Format: `[name, "in {parentName}" | amount]`

**Amount editing:**
- Click amount → turns into text input
- While editing, click currency symbol (¥, $, €) → opens currency picker
- Enter or blur → commits change
- Updates experience.amount and experience.currency

### Add Row

"+ Add expense..." at bottom

- Creates new experience with amount
- Opens inline input for name
- Default currency from trip or last expense

### Totals

**Highlighted subtotal:**
- Sum of amounts for selected + highlighted expenses
- Only appears when there are active selections
- Label: "Highlighted" (not "Selected")
- Multi-currency format: "¥3,200 + $120"

**Total:**
- Sum of ALL expenses
- Always shown at bottom
- Multi-currency format: "$120 + ¥111,400"

### Selection/Highlighting

Same visual treatment:
- Selected rows: solid blue background, white text
- Highlighted rows: tinted blue background, colored border

## Selection Popover

Fixed at bottom-center of screen. Appears when anything is selected.

**Contents:**
- Entity chips (same style as notes chips)
- All chips shown in selected (inverted) state
- Pin/clock/amount indicators visible
- Max 8 chips shown, then "+N more" text
- × button at right end

**Interactions:**
- Click chip → deselects it (always acts as Ctrl+click)
- Click × → clears all selection
- Chips have full indicators and are independently clickable

**Visual:**
- Semi-transparent dark background
- Centered horizontally
- 8px padding
- Chips flow horizontally with wrap

## Visual Design System

### Colors

```
Background:        #f8f7f5
Surface:           #ffffff
Border:            rgba(0,0,0,0.09)
Text:              #1a1917
Text muted:        #555249

Place accent:      #a33d22
Experience blue:   #2d5f82

Highlight bg (place):   rgba(163,61,34,0.06)
Highlight border (place): rgba(163,61,34,0.22)
Highlight bg (exp):     rgba(45,95,130,0.08)
Highlight border (exp): rgba(45,95,130,0.28)
```

### Selection States

Consistent across ALL views:

**Default:**
- Transparent or very light tinted background
- Subtle border (1px)

**Highlighted:**
- Semi-transparent colored background
- Stronger colored border (1.5px)
- Clearly secondary to selected state

**Selected:**
- Solid colored background
- White text, icons, and dividers
- Colored border (1.5px)
- Fully inverted appearance

### Typography

- UI: DM Sans (400, 500, 600, 700)
- Notes prose: Georgia serif
- Font sizes: 9-14px
  - UI labels: 9-12px
  - Notes prose: 14px
  - Title: 17px
  - Section headers: 12px

### Chip Dividers

Inside chips, sections separated by 1px vertical rules:
- Default: `${typeColor}20` (20% opacity)
- Selected: `rgba(255,255,255,0.25)` (25% white opacity)

Each indicator section has hover effect:
- Slight opacity increase
- Subtle background change

## Common Interaction Patterns

### Selection

1. **Click an entity** anywhere (notes, tree, schedule, expenses) → selects it
2. **Ctrl/Cmd+click** → toggles entity in/out of multi-selection
3. **Click same entity** again → deselects it
4. **Day header click** (schedule) → selects all experiences on that date

Selection is global - selecting in one view updates all views simultaneously.

**Critical details:**
- Clicking a place pin icon on a chip **always opens the map**. On a place chip, it selects that place. On an experience chip, it selects the *experience* (not the place).
- Day selection must be atomic (one state update, not looping through individual selects).

### Highlighting

Automatically computed from selection:
- Selected entity's descendants
- Selected experience's places
- Selected place's experiences

Highlighted entities show in all views with consistent visual treatment.

### Navigation

Clicking chip indicators opens specific views:
- Pin icon → Map view
- Clock icon → Schedule view
- Amount → Expenses view

The entity is selected, and the view switches.

### Inline Editing

Click editable values (time, amount) → becomes text input:
- Input is focused immediately
- Enter or blur commits
- Escape cancels
- Subtle hover state (background change) indicates editability

**Examples:**
- Schedule time: Click time → input → Enter/blur commits via `store.updateExperience`
- Expense amount: Click amount → input → Enter/blur commits. Click currency symbol during edit → opens currency picker.

### Drag-and-Drop

Primarily for reparenting (trees) and rescheduling (schedule):
- Drag source shows grab cursor
- Drop targets highlight on dragover
- Visual feedback during drag
- Drop commits the change

**Tree reparenting:** Drag entity onto another → calls `store.reparent(id, newParentId)`
**Schedule rescheduling:** Drag experience between dates → updates `experience.schedule.date`

## Testing

All views have E2E test coverage. See `docs/TESTING.md` for details.

Key scenarios tested:
- Rendering hierarchy correctly
- Selection and highlighting
- Inline editing
- Drag-and-drop
- Navigation between views
- Selection persistence across views
