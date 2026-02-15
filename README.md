# Waypoint

Collaborative travel planning — notes-first with structured entity linking.

## Quick start

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. The app loads with seed data (Kyoto March 2026 trip) so you can immediately see entity chips in the notes editor.

**Reference mockup:** The file `two-pane-v12.jsx` in the project root is a self-contained React artifact demonstrating the complete UI design (~800 lines). Paste it into any React sandbox to see the intended visual appearance and interactions.

## Architecture

```
src/
├── entities/          # Core data model
│   ├── types.ts       # Place, Experience, Trip types + factory functions
│   ├── helpers.ts     # Pure traversal: descendants, costs, highlighting
│   ├── store.ts       # Zustand store (local-first, Liveblocks-syncable)
│   ├── selection.ts   # Selection store (click/ctrl-click/day-click)
│   └── seed.ts        # Kyoto trip seed data + TipTap document
│
├── editor/            # TipTap notes editor
│   ├── ChipExtension.tsx   # Inline entity chip node (atom, reactive)
│   ├── SlashCommand.tsx     # /-command for linking/creating entities
│   └── NotesEditor.tsx      # Editor component wiring
│
├── liveblocks/        # Real-time collaboration
│   ├── config.ts      # Client setup, types, room context
│   ├── sync.ts        # Bidirectional entity sync
│   └── Room.tsx       # Room wrapper component
│
├── App.tsx            # Root: two-pane layout, tab routing, hydration
├── styles.css         # Design tokens + all component styles
└── main.tsx           # Entry point
```

## Features

- **Entity model**: Place (locatable, tree hierarchy) and Experience (temporal, optional amount). Full type system with factory functions.
- **Entity store**: Zustand with CRUD operations. Cascading deletes, reparenting, sort order.
- **Selection system**: Click/Ctrl-click/day-click with derived highlighting. `computeHighlighted()` follows relationships bidirectionally.
- **Notes editor**: TipTap with custom EntityChip inline nodes. Chips are reactive and show type-specific icons and indicators.
- **Slash commands**: Type `/` to search entities. Create new entities inline. Inserts chip on selection.
- **Tree views**: Places and Experiences hierarchies with drag-and-drop reparenting.
- **Schedule view**: Chronological list, drag-to-reschedule, inline time editing, timezone picker.
- **Expenses view**: Filtered expense list, inline amount editing, multi-currency totals.
- **Map view**: Leaflet integration with entity pins, selection/highlight states, unlocated footer.
- **Real-time collaboration**: Liveblocks integration for entity sync, collaborative editing, and presence.

## Documentation

**[AGENTS.md](./AGENTS.md)** - Documentation index and table of contents

**Core guides:**
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) - Entity types, relationships, store architecture
- [docs/EDITOR.md](./docs/EDITOR.md) - Notes editor, chips, slash commands
- [docs/VIEWS.md](./docs/VIEWS.md) - UI views and interactions
- [docs/TESTING.md](./docs/TESTING.md) - E2E testing with Playwright
- [docs/COLLABORATION.md](./docs/COLLABORATION.md) - Real-time features with Liveblocks

## Design decisions

- **Entities not notes are the source of truth.** Notes reference entities via chips. Entity data lives in the store, not in the document.
- **Selection ≠ highlighting.** Selected = explicitly clicked. Highlighted = derived (children, associated places/experiences). Different visual treatment.
- **Chips are atoms.** TipTap treats them as single inline units. Only the `entityId` is stored in the document; all display data comes from the live store.
- **Local-first.** Zustand store works offline. Liveblocks syncs when connected. No hard dependency on network.
