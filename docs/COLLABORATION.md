# Real-Time Collaboration

## Overview

Waypoint uses [PartyKit](https://partykit.io/) for real-time collaboration features:

- **Entity sync**: Places and experiences sync across all connected clients via Yjs
- **Document collaboration**: Notes editor supports simultaneous editing via Yjs CRDT
- **Presence**: See other users' cursors and selections in real-time via Yjs awareness
- **Persistence**: Data persists across sessions via Cloudflare Durable Objects

## Quick Start

### 1. Start the PartyKit Server

```bash
pnpm dev:partykit
```

This starts a local PartyKit server on `localhost:1999`.

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
VITE_PARTYKIT_HOST=localhost:1999
```

### 3. Start the App

```bash
pnpm dev
```

Opens at http://localhost:3000.

### 4. Test Collaboration

Open the app in **two browser windows** side by side:

**Test entity sync:**
1. Window 1: Go to Places view, add a new place
2. Window 2: Switch to Places view → new place appears!

**Test document collaboration:**
1. Window 1: Type in the notes editor
2. Window 2: See text appear as you type!

**Test cursors:**
1. Window 1: Click in the notes editor
2. Window 2: See a colored cursor bar with name label

## Local-Only Mode

To work without PartyKit (no collaboration):

```bash
# Just don't set the env var
pnpm dev
```

Everything works locally, but:
- No real-time sync
- No collaborative editing
- Data resets on page reload

Perfect for feature development without running the PartyKit server.

## Architecture

### Data Flow

```
┌─────────────── PartyKit Server ────────────────┐
│                                                  │
│  y-partykit onConnect                            │
│  ├── Yjs sync protocol (binary frames)          │
│  └── Durable Object persistence (snapshots)     │
│                                                  │
└──────────────────────────────────────────────────┘
                       ↕ WebSocket (YPartyKitProvider)
┌─────────────── Client App ────────────────────┐
│                                                  │
│  Y.Doc (shared Yjs document)                     │
│  ├── Y.XmlFragment "default" → TipTap editor   │
│  ├── Y.Map "entities" → Zustand entity store    │
│  └── Y.Map "trip" → Zustand trip store          │
│                                                  │
│  Awareness protocol                              │
│  ├── Cursor position → CollaborationCursor      │
│  ├── User info (name, color)                     │
│  └── Selected entity IDs                         │
│                                                  │
│  Zustand stores → React components               │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Why Yjs for Everything

All synced data lives in a single Yjs document:

- **Document text** (Y.XmlFragment): TipTap's `@tiptap/extension-collaboration` handles this natively
- **Entity data** (Y.Map): stored as plain JSON objects, last-write-wins per entity
- **Trip data** (Y.Map): stored under a single key

This means:
- One WebSocket connection per client (via `YPartyKitProvider`)
- One sync protocol (Yjs)
- The PartyKit server is ~15 lines (just delegates to `y-partykit`)
- No custom message protocol needed

### Entity Sync

**Local mutation → Remote:**

1. User makes change (e.g., adds place)
2. Zustand store mutation runs
3. `usePartyKitSync` detects change via `useEffect`
4. Updates `Y.Map` entries in the Yjs document
5. `YPartyKitProvider` syncs to PartyKit server
6. Server broadcasts to other clients via Yjs sync protocol

**Remote change → Local:**

1. Remote client makes change
2. Yjs document update arrives via WebSocket
3. `Y.Map.observeDeep` fires in `usePartyKitSync`
4. Zustand `hydrate()` updates local store
5. React components re-render

### Document Collaboration

1. User types in editor
2. TipTap updates Yjs document (Y.XmlFragment)
3. `YPartyKitProvider` syncs to PartyKit server
4. Remote clients receive updates via Yjs
5. Changes appear in real-time

**Why Yjs?**
- CRDT (Conflict-free Replicated Data Type)
- Handles simultaneous edits gracefully
- No conflicts, no lost data
- Industry standard for collaborative text editing

### Presence

**Cursor tracking:**
- TipTap's `CollaborationCursor` extension handles cursor broadcasting
- Uses Yjs awareness protocol automatically
- Other users' cursors rendered with name and color

**Selection broadcasting:**
- Selected entity IDs broadcast via `awareness.setLocalStateField`
- Other clients can observe what's selected

## Implementation

### Files

**Server:**
- `party/main.ts` - PartyKit server (delegates to y-partykit)
- `partykit.json` - PartyKit configuration

**Client:**
- `src/partykit/config.ts` - Feature flag, types
- `src/partykit/sync.ts` - Bidirectional Zustand ↔ Yjs sync
- `src/partykit/Party.tsx` - Party wrapper component + context
- `src/partykit/index.ts` - Barrel export

**Modified:**
- `src/editor/CollaborativeNotesEditor.tsx` - Uses PartyKit context for Yjs provider
- `src/App.tsx` - Party wrapper, conditional editor

### Sync Logic

Entity sync is handled by `usePartyKitSync()` hook in `src/partykit/sync.ts`:

**On mount (hydration):**
```typescript
const yEntities = yDoc.getMap("entities");

// If Yjs already has data (from persistence or another client), hydrate Zustand
if (yEntities.size > 0) {
  const entityList = [];
  yEntities.forEach((val) => entityList.push(val));
  hydrate(entityList, tripData);
}
```

**On local change:**
```typescript
useEffect(() => {
  // Diff against previous state
  // Update Y.Map entries (add/update/delete)
  yDoc.transact(() => {
    for (const entity of toAdd) yEntities.set(entity.id, entity);
    for (const id of toDelete) yEntities.delete(id);
  });
}, [entities]);
```

**On remote change:**
```typescript
yEntities.observeDeep(() => {
  const entityList = [];
  yEntities.forEach((val) => entityList.push(val));
  hydrate(entityList, trip);
});
```

## Room Management

### Room ID

The app uses a hardcoded room ID: `waypoint-kyoto`

To support multiple trips:
1. Extract trip ID from URL or database
2. Pass dynamic room ID to `<Party roomId={tripId}>`

### Initialization

On first connection to a room:
- If Yjs document is empty, the first client seeds it with `SEED_ENTITIES` and `SEED_TRIP`
- Subsequent clients receive the existing state via Yjs sync
- Data persists via `y-partykit` snapshot persistence

### User Info

Currently: Random names and colors generated on connect.

For production:
1. Integrate with authentication system
2. Pass real user data to awareness via `provider.awareness.setLocalStateField`

## Conflict Resolution

### Entity Mutations

**Strategy:** Last-write-wins (per entity)

When two users edit the same entity simultaneously:
- Both changes propagate via Y.Map
- Last update received wins
- Simple but effective for travel planning

### Document Edits

**Strategy:** Yjs CRDT

When two users edit the same paragraph:
- Yjs merges changes automatically
- No conflicts, no lost data
- Preserves both users' intent

## Deployment

### Deploy PartyKit Server

```bash
pnpm partykit deploy
```

This deploys to `waypoint.your-username.partykit.dev`.

### Configure Production

Set the environment variable for the deployed host:

```bash
VITE_PARTYKIT_HOST=waypoint.your-username.partykit.dev
```

### Authentication (Production)

For production, add authentication in the PartyKit server's `onConnect`:

```typescript
onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
  // Verify auth token from ctx.request headers
  const token = new URL(ctx.request.url).searchParams.get("token");
  if (!isValidToken(token)) {
    conn.close(4001, "Unauthorized");
    return;
  }
  return onConnect(conn, this.room, { persist: { mode: "snapshot" } });
}
```

## Testing

### Manual Testing

```bash
# Terminal 1: Start PartyKit server
pnpm dev:partykit

# Terminal 2: Start Vite dev server
VITE_PARTYKIT_HOST=localhost:1999 pnpm dev
```

Open multiple browser windows to test:
- Entity creation/update/delete syncs
- Typing appears in real-time
- Cursors move as users type
- Selection changes broadcast

### Automated Testing

E2E tests for collaboration in `e2e/phase6.spec.ts`:

**Scenarios tested:**
- Entity sync (create/update/delete/reparent)
- Document collaboration (typing, simultaneous edits)
- Presence and cursors
- Selection broadcasting
- Multi-user workflows
- Connection and recovery

Run with:
```bash
VITE_PARTYKIT_HOST=localhost:1999 pnpm test:e2e:phase6
```

**Local-only tests** in `e2e/phase6-basic.spec.ts`:
- Verify app works without PartyKit
- No server required

## Troubleshooting

### "Connecting to room..." forever

**Causes:**
- PartyKit server not running
- Wrong `VITE_PARTYKIT_HOST` value
- Network connection issues

**Solutions:**
- Run `pnpm dev:partykit` in a separate terminal
- Verify `.env` has correct host (`localhost:1999` for local dev)
- Check browser console for WebSocket errors

### Changes not syncing

**Causes:**
- Clients connected to different rooms
- Network latency
- Yjs document not initialized

**Solutions:**
- Wait 1-2 seconds for sync
- Check all clients have same room ID
- Verify PartyKit server is running

### Cursor not showing

**Causes:**
- Not clicking in editor
- Awareness not syncing

**Solutions:**
- Click in notes editor to set position
- Wait ~1 second for awareness to sync
- Check if `.collaboration-cursor__caret` exists in DevTools

## Collaborative Cursors

### Visual Design

Cursors appear as colored vertical bars with name labels:

```
┌─────────────────────────┐
│ Some text █ more text   │  ← Colored bar at cursor position
│           └─ Alex       │  ← Name label below
└─────────────────────────┘
```

### Styling

Defined in `src/styles.css`:

```css
.collaboration-cursor__caret {
  position: absolute;
  width: 2px;
  height: 1.2em;
  pointer-events: none;
  background-color: var(--cursor-color);
}

.collaboration-cursor__label {
  position: absolute;
  bottom: -1.3em;
  left: 0;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  background-color: var(--cursor-color);
  color: white;
}
```

## References

- [PartyKit Documentation](https://docs.partykit.io/)
- [y-partykit](https://github.com/partykit/partykit/tree/main/packages/y-partykit)
- [TipTap Collaboration](https://tiptap.dev/docs/editor/extensions/functionality/collaboration)
- [Yjs Documentation](https://docs.yjs.dev/)
- [CRDT Explained](https://crdt.tech/)
