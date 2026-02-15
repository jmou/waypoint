# Waypoint

Collaborative travel planning — notes-first with structured entity linking.

## Quick start

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. The app loads with seed data (Kyoto March 2026 trip) so you can immediately see entity chips in the notes editor.

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
├── liveblocks/        # Real-time collaboration (placeholder)
│   └── config.ts      # Client setup, types, room context
│
├── App.tsx            # Root: two-pane layout, tab routing, hydration
├── styles.css         # Design tokens + all component styles
└── main.tsx           # Entry point
```

## What's working

- **Entity model**: Place (locatable, tree hierarchy) and Experience (temporal, DAG-capable, optional amount). Full type system with factory functions.
- **Entity store**: Zustand with CRUD for places and experiences. Hydrate from seed or Liveblocks. Cascading deletes, reparenting, sort order.
- **Selection system**: Click/Ctrl-click/day-click with derived highlighting. `computeHighlighted()` follows relationships bidirectionally (place→experiences, experience→places, parent→children).
- **Notes editor**: TipTap with custom EntityChip inline node. Chips are reactive (read live entity data from store), show type-specific icons and indicators.
- **Slash commands**: Type `/` to search entities. Prioritizes unmentioned entities. Create new entities inline. Inserts chip on selection.
- **Two-pane layout**: Map/Schedule/Expenses left, Notes/Places/Experiences right. Tab switching with navigation from chip clicks.

## What's next

1. **Wire Liveblocks**: Add `VITE_LIVEBLOCKS_PUBLIC_KEY` to `.env`, uncomment `liveblocks/config.ts`, wrap App in `<RoomProvider>`, sync entity store to LiveMap, connect TipTap to Yjs provider.
2. **Places tree view**: Render `getRoots("place")` + `getChildren()`, drag-and-drop reparenting, inline add.
3. **Experiences tree view**: Same pattern with schedule/amount metadata in line items.
4. **Schedule view**: Date range header, grouped by day, drag between dates, inline time editing, timezone picker.
5. **Expenses view**: Filtered experience list, inline amount + currency editing, multi-currency totals.
6. **Map view**: Leaflet/Mapbox with entity pins, selection/highlight states, unlocated footer.

## Design decisions

- **Entities not notes are the source of truth.** Notes reference entities via chips. Entity data lives in the store, not in the document.
- **Selection ≠ highlighting.** Selected = explicitly clicked. Highlighted = derived (children, associated places/experiences). Different visual treatment.
- **Chips are atoms.** TipTap treats them as single inline units. Only the `entityId` is stored in the document; all display data comes from the live store.
- **Local-first.** Zustand store works offline. Liveblocks syncs when connected. No hard dependency on network.
