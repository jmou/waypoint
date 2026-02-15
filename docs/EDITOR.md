# Notes Editor

## Overview

The notes editor uses TipTap (a ProseMirror wrapper) with custom extensions for entity chips and slash commands. Entities appear as inline, atomic chips that are reactive to store changes.

## Architecture

```
NotesEditor (src/editor/NotesEditor.tsx)
├── TipTap Editor
├── Extensions:
│   ├── StarterKit (paragraphs, headings, bold, etc.)
│   ├── EntityChipExtension (inline entity references)
│   └── SlashCommandExtension (entity search + creation)
└── Store Integration:
    ├── Reads from useEntityStore()
    ├── Updates selection on chip clicks
    └── Inserts chips via slash commands
```

## Entity Chips

### What are Chips?

Chips are inline, atomic nodes that reference entities. They display live data from the store and respond to user interactions.

**Key properties:**
- Stored in document as `{ type: "entityChip", attrs: { entityId: "p-kyoto" } }`
- Display data is always fetched live from the entity store
- Atomic: treated as single units (can't edit inside, can't split)
- Reactive: re-render when entity data or selection changes

### Visual Structure

**Place chips:**
```
┌──────────────────┐
│ 📍 | Kyoto       │  ← pin icon, vertical rule, name
└──────────────────┘
```

**Experience chips:**
```
┌────────────────────────────────────┐
│ Fushimi hike | 📍 | 🕐 | ¥850      │  ← name, pin, clock, amount
└────────────────────────────────────┘
```

Indicators appear when the experience has:
- Pin icon: associated place(s)
- Clock icon: schedule
- Amount: cost (makes it an expense)

Each section is independently clickable.

### Visual States

**Default:**
- Light background with subtle border
- Type color (red for places, blue for experiences)

**Selected:**
- Solid colored background
- White text and icons
- White dividers
- Inverted appearance

**Highlighted:**
- Semi-transparent colored background
- Stronger colored border
- Secondary to selected state

### Click Behavior

Each chip section has independent click handling:

**Place chips:**
- Pin icon → selects place + opens Map view
- Name → selects place (no navigation)

**Experience chips:**
- Name → selects experience (no navigation)
- Pin icon → selects experience + opens Map view (not the place!)
- Clock icon → selects experience + opens Schedule view
- Amount → selects experience + opens Expenses view

**Modifier keys:**
- Plain click: replace selection
- Ctrl/Cmd+click: toggle in/out of multi-selection

### Implementation

Entity chips are defined in `src/editor/ChipExtension.tsx`:

```typescript
export const EntityChipExtension = Node.create({
  name: "entityChip",
  group: "inline",
  inline: true,
  atom: true, // Treated as single unit

  addAttributes() {
    return {
      entityId: { default: null },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChipNodeView);
  },
});
```

The `ChipNodeView` component:
- Reads entity from store via `entityId`
- Computes selection/highlighting state
- Renders the shared `<Chip>` component
- Handles click events and navigation

## Slash Commands

### Overview

Typing `/` in the editor opens a floating popover for inserting entity references or creating new entities.

### Features

**Entity search:**
- Lists existing entities prioritized by:
  1. Not yet mentioned in document
  2. Already mentioned
- Fuzzy search by name
- Shows entity type (place/experience) and metadata

**Entity creation:**
- "Create new Place..." option
- "Create new Experience..." option
- Creates entity and inserts chip in one action

**Keyboard navigation:**
- Arrow keys to navigate results
- Enter to select
- Escape to cancel

### Implementation

Defined in `src/editor/SlashCommand.tsx` as a ProseMirror plugin:

```typescript
export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("slashCommand"),
        // ... plugin configuration
      }),
    ];
  },
});
```

**How it works:**
1. Detects `/` character typed
2. Shows floating popover at cursor position
3. User searches/creates entity
4. On select: replaces `/` with entity chip node
5. Cursor moves after inserted chip

### Popover Positioning

Uses ProseMirror's `view.coordsAtPos()` to position the popover near the cursor. For more robust positioning, consider using `@floating-ui/react`.

## Document Structure

### Storage Format

Documents are stored as ProseMirror/TipTap JSON:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Visit " },
        {
          "type": "entityChip",
          "attrs": { "entityId": "p-fushimi" }
        },
        { "type": "text", "text": " on March 16." }
      ]
    }
  ]
}
```

**Important:** Only the `entityId` is stored. All display data (name, schedule, amount) comes from the entity store at render time.

### Why This Matters

**Benefits:**
- Entity updates automatically reflect in all mentions
- No stale data in documents
- Smaller document size
- Easier to sync (just IDs, not full entity data)

**Tradeoffs:**
- Broken references if entity is deleted (could show "deleted entity" placeholder)
- Can't have entity-specific notes per mention (could add `note` attribute if needed)

## Paragraph-Level Highlighting

Paragraphs that contain selected or highlighted chips get visual treatment:

**Selected:**
- Left border: solid accent color
- Background: subtle tint

**Highlighted:**
- Left border: lighter accent color
- Background: fainter tint

This helps users see which blocks are relevant to their current selection.

## Collaborative Editing

See `docs/COLLABORATION.md` for details on real-time collaborative editing with Liveblocks and Yjs.

Key points:
- Yjs provides CRDT for conflict-free merging
- TipTap Collaboration extension handles sync
- Cursor positions broadcast via presence
- Works with entity chips (they're just ProseMirror nodes)

## Styling

### Typography

- Prose: Georgia serif, 14px
- UI elements (chips): DM Sans, 11-12px

### Colors

Defined in `src/styles.css`:

```css
--place-accent: #a33d22;
--experience-blue: #2d5f82;
--highlight-bg-place: rgba(163, 61, 34, 0.06);
--highlight-border-place: rgba(163, 61, 34, 0.22);
--highlight-bg-exp: rgba(45, 95, 130, 0.08);
--highlight-border-exp: rgba(45, 95, 130, 0.28);
```

## Testing

Entity chips have comprehensive E2E test coverage. See `docs/TESTING.md` for details.

Key test scenarios:
- Chip rendering with correct icons and indicators
- Click behavior (selection, navigation)
- Visual states (default, selected, highlighted)
- Paragraph-level highlighting
- Multi-selection with Ctrl+click

All tests use data attributes for reliable element selection (e.g., `data-entity-chip`, `data-entity-id`).
