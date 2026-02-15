# Real-Time Collaboration

## Overview

Waypoint uses [Liveblocks](https://liveblocks.io/) for real-time collaboration features:

- **Entity sync**: Places and experiences sync across all connected clients
- **Document collaboration**: Notes editor supports simultaneous editing
- **Presence**: See other users' cursors and selections in real-time
- **Offline support**: Changes queue and sync when reconnected

## Quick Start

### 1. Get a Liveblocks API Key

1. Sign up at [liveblocks.io](https://liveblocks.io/)
2. Create a new project (free tier is fine)
3. Copy your **Public API Key** from the dashboard

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_key_here
```

Or export it in your shell:

```bash
export VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_key_here
```

### 3. Start the App

```bash
pnpm dev
```

Open http://localhost:3000

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

To work without Liveblocks (no collaboration):

```bash
# Just don't set the env var
pnpm dev
```

Everything works locally, but:
- No real-time sync
- No collaborative editing
- Data resets on page reload

Perfect for feature development without needing a Liveblocks account.

## Architecture

### Data Flow

```
┌────────────────── Liveblocks Room ──────────────────┐
│                                                      │
│  Storage                                             │
│  ├── entities: LiveMap<EntityId, Entity>            │
│  └── trip: Trip                                      │
│                    ↕                                 │
│  Yjs Document (notes content)                        │
│                    ↕                                 │
│  Presence (cursor, selectedIds, user info)           │
│                                                      │
└──────────────────────────────────────────────────────┘
                       ↕
┌────────────────── Client App ───────────────────────┐
│                                                      │
│  Zustand Store (entities, trip)                      │
│         ↕                                            │
│  TipTap Editor (notes document)                      │
│         ↕                                            │
│  React Components (views)                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Storage Sync

**Local mutation → Liveblocks:**

1. User makes change (e.g., adds place)
2. Zustand store mutation runs
3. `useLiveblocksSync` detects change
4. `syncToLiveblocks` updates LiveMap
5. Liveblocks broadcasts to other clients

**Remote change → Local:**

1. Remote client makes change
2. LiveMap subscription fires
3. `useLiveblocksSync` extracts entities
4. Zustand `hydrate()` updates local store
5. React components re-render

### Document Collaboration

1. User types in editor
2. TipTap updates Yjs document
3. LiveblocksYjsProvider syncs to Liveblocks
4. Remote clients receive updates via Yjs
5. Changes appear in real-time

**Why Yjs?**
- CRDT (Conflict-free Replicated Data Type)
- Handles simultaneous edits gracefully
- No conflicts, no lost data
- Industry standard for collaborative text editing

### Presence

**Cursor tracking:**
- Each user's cursor position broadcast via `updateMyPresence()`
- Other users' cursors rendered with name and color
- Updates throttled to 60fps to reduce network traffic

**Selection broadcasting:**
- Selected entity IDs included in presence
- Other clients can see what's selected
- Useful for "who's looking at what" awareness

## Implementation

### Files

**Core:**
- `src/liveblocks/config.ts` - Client setup, types, hooks
- `src/liveblocks/sync.ts` - Bidirectional entity sync
- `src/liveblocks/Room.tsx` - Room wrapper component
- `src/editor/CollaborativeNotesEditor.tsx` - Yjs-based editor

**Modified:**
- `src/App.tsx` - LiveblocksRoom wrapper, conditional editor
- `src/styles.css` - Collaborative cursor styles

### Hooks

Liveblocks provides React hooks for accessing collaborative state:

```typescript
import {
  useRoom,
  useMyPresence,
  useOthers,
  useStorage,
  useMutation,
} from './liveblocks/config';

// Get room instance
const room = useRoom();

// Get/update own presence
const [myPresence, updateMyPresence] = useMyPresence();

// Get other users
const others = useOthers();

// Read storage
const entities = useStorage((root) => root.entities);

// Mutate storage
const addPlace = useMutation(({ storage }, place) => {
  storage.get('entities').set(place.id, place);
}, []);
```

### Sync Logic

Entity sync is handled by `useLiveblocksSync()` hook in `src/liveblocks/sync.ts`:

**On local change:**
```typescript
useEffect(() => {
  if (!room) return;

  const prevState = previousStateRef.current;
  const currentState = entities;

  room.batch(() => {
    // Detect adds, updates, deletes
    // Update LiveMap accordingly
  });

  previousStateRef.current = currentState;
}, [entities, room]);
```

**On remote change:**
```typescript
useEffect(() => {
  if (!room) return;

  return room.subscribe(storage.get('entities'), (liveEntities) => {
    const remoteEntities = extractEntitiesFromLiveMap(liveEntities);
    hydrate(remoteEntities, trip);
  });
}, [room, hydrate]);
```

## Room Management

### Room ID

The app uses a hardcoded room ID: `waypoint-kyoto`

To support multiple trips:
1. Extract trip ID from URL or database
2. Pass dynamic room ID to `<LiveblocksRoom roomId={tripId}>`

### Initialization

On first connection to a room:
- First client initializes storage with seed data
- Subsequent clients load from existing storage
- Storage persists in Liveblocks (doesn't reset on reload)

To reset a room, delete it via the Liveblocks dashboard.

### User Info

Currently: Random names and colors generated on connect

For production:
1. Integrate with authentication system
2. Pass real user data to `RoomProvider` initialPresence
3. Update `LiveblocksRoom.tsx` to get user from auth context

## Presence Details

Each user has:
- **Name**: Random name (Alex, Sam, Jordan, etc.)
- **Color**: Random color from palette (for cursor)
- **Cursor position**: Updated on every selection change
- **Selected IDs**: Array of currently selected entity IDs

Cursor position format:
```typescript
{
  cursor: {
    from: number,  // Selection start position
    to: number,    // Selection end position
  },
  selectedIds: string[],
}
```

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

## Testing

### Manual Testing

```bash
export VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx
pnpm dev
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
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx pnpm test:e2e:phase6
```

**Local-only tests** in `e2e/phase6-basic.spec.ts`:
- Verify app works without Liveblocks
- No API key required

## Conflict Resolution

### Entity Mutations

**Strategy:** Last-write-wins

When two users edit the same entity simultaneously:
- Both changes propagate to Liveblocks
- Last update received wins
- Simple but effective for most use cases

**Why not CRDTs for entities?**
- Entity data is small and atomic
- Conflicts are rare in travel planning
- Last-write-wins is intuitive
- CRDTs add complexity

### Document Edits

**Strategy:** Yjs CRDT

When two users edit the same paragraph:
- Yjs merges changes automatically
- No conflicts, no lost data
- Preserves both users' intent
- Industry-proven for text editing

## Performance

### Optimizations

**Presence throttling:**
- Updates throttled to 16ms (60fps)
- Reduces network traffic
- Maintains smooth cursor movement

**Shallow comparison:**
- Entity sync uses JSON comparison
- Efficient for small entity maps (<10,000 entities)
- Avoids unnecessary broadcasts

**CRDT efficiency:**
- Yjs provides optimal conflict-free merging
- Only transmits changes, not full document
- Handles large documents well

### Limits

For good performance:
- Keep entity count < 10,000
- Keep document size < 1MB
- Monitor Liveblocks dashboard for usage

## Troubleshooting

### "Connecting to room..." forever

**Causes:**
- API key incorrect
- Network connection issues
- Liveblocks service down

**Solutions:**
- Verify API key in `.env`
- Check browser console for errors
- Check Liveblocks dashboard status

### Changes not syncing

**Causes:**
- Clients in different rooms
- Network latency
- Storage not initialized

**Solutions:**
- Wait 1-2 seconds for sync
- Check all clients have same room ID
- Verify Liveblocks dashboard shows connections

### Cursor not showing

**Causes:**
- Not clicking in editor
- Presence not syncing

**Solutions:**
- Click in notes editor to set position
- Wait ~1 second for presence to sync
- Check if `.collaboration-cursor__caret` exists in DevTools

### Tests failing

**Cause:** No API key set

**Solution:**
```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx pnpm test:e2e:phase6
```

Phase 6 tests are skipped if env var not set.

## Production Considerations

### Authentication

Current setup uses **public API key** (dev only).

For production:
1. Use Liveblocks authentication system
2. Generate access tokens server-side
3. Use `authEndpoint` instead of `publicApiKey`
4. Implement user permissions

See: https://liveblocks.io/docs/authentication

### Rate Limits

Free tier limits:
- 100 concurrent connections
- 100 MB storage
- 100 GB bandwidth/month

Monitor usage in Liveblocks dashboard. Upgrade as needed.

### Monitoring

Track:
- Sync latency
- Bandwidth usage
- Connection drops
- Storage size

Add instrumentation to `sync.ts` for production monitoring.

### Access Control

Consider implementing:
- Room permissions (read/write)
- User roles (admin/editor/viewer)
- Entity-level permissions

## Known Issues

### TypeScript Types

Liveblocks requires `LsonObject` which has index signatures. Our entity types don't match exactly, so we use `any` in places:

```typescript
type Storage = {
  entities: LiveMap<string, any>;  // Instead of LiveObject<Entity>
  trip: any;  // Instead of LiveObject<Trip>
};
```

Runtime behavior is correct. This is a known limitation of Liveblocks type system.

### Initial Storage

First client to join a room initializes storage with seed data. This is simple for demo purposes.

For production:
- Initialize storage server-side when creating a trip
- Use Liveblocks REST API to pre-populate rooms

### Cursor Jitter

Cursor position may occasionally jitter due to:
- Browser layout shifts
- Scroll position changes
- Editor DOM updates

This is a known issue with browser-based collaborative cursors and is acceptable for most use cases.

## Future Enhancements

1. **Awareness indicators** - Show which view other users are on
2. **Conflict UI** - Toast when concurrent edits happen
3. **Undo/Redo with Liveblocks** - Use Liveblocks history API
4. **Performance monitoring** - Track sync latency and bandwidth
5. **Access control** - Room permissions and user roles

## References

- [Liveblocks Documentation](https://liveblocks.io/docs)
- [TipTap Collaboration](https://tiptap.dev/docs/editor/extensions/functionality/collaboration)
- [Yjs Documentation](https://docs.yjs.dev/)
- [CRDT Explained](https://crdt.tech/)
