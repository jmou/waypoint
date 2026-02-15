# Liveblocks Integration

This document explains how to use the Liveblocks collaborative features in Waypoint.

## Overview

Waypoint uses [Liveblocks](https://liveblocks.io/) for real-time collaboration:

- **Entity sync**: Places and experiences sync across all connected clients via Liveblocks Storage
- **Document collaboration**: The notes editor uses Yjs + Liveblocks for collaborative editing
- **Presence**: See other users' cursors and selections in real-time
- **Offline support**: Changes are queued and synced when reconnected

## Setup

### 1. Get a Liveblocks API Key

1. Sign up at [liveblocks.io](https://liveblocks.io/)
2. Create a new project
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

### 3. Run the App

```bash
pnpm dev
```

The app will automatically connect to Liveblocks when the environment variable is set.

## Local Development (Without Liveblocks)

If `VITE_LIVEBLOCKS_PUBLIC_KEY` is not set, the app runs in **local mode**:

- All state is managed by Zustand (client-side only)
- No real-time sync or collaboration
- Data resets on page reload
- Perfect for working on features without needing a Liveblocks account

## Architecture

### Storage Sync

**Zustand → Liveblocks:**
- All entity mutations (add/update/remove/reparent) are mirrored to `LiveMap<EntityId, LiveObject<Entity>>`
- Changes are atomic and immediately synced to other clients
- Last-write-wins strategy for conflicts

**Liveblocks → Zustand:**
- Remote changes trigger Zustand store updates
- Components re-render automatically via Zustand subscriptions
- No manual polling or WebSocket management needed

### Document Collaboration

**TipTap + Yjs + Liveblocks:**
- The notes editor uses TipTap's Collaboration extension
- Yjs provides the CRDT for conflict-free merging
- LiveblocksYjsProvider handles network sync
- Supports simultaneous editing by multiple users

### Presence

**Cursor tracking:**
- Each user's cursor position is broadcast via `updateMyPresence()`
- Other users' cursors are rendered with their name and color
- Cursor updates are throttled to 60fps to reduce network traffic

**Selection broadcasting:**
- Selected entity IDs are included in presence
- Other clients can see what entities are selected by each user
- Useful for showing "who's looking at what"

## Testing Collaboration

### Option 1: Multiple Browser Windows

Open the app in multiple browser windows (same or different browsers):

```bash
# Terminal 1
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx pnpm dev

# Then open multiple browsers to http://localhost:3000
```

Each window represents a different user. Changes in one window appear in all others.

### Option 2: E2E Tests

Run the Phase 6 E2E tests with multiple browser contexts:

```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx pnpm test:e2e:phase6
```

These tests simulate multiple users and verify sync behavior.

## Room Management

### Room ID

The app uses a hardcoded room ID: `waypoint-kyoto`

To support multiple trips, you'll need to:
1. Extract trip ID from URL or database
2. Pass dynamic room ID to `<LiveblocksRoom roomId={tripId}>`

### Initialization

On first connection to a room:
- The first client initializes storage with seed data
- Subsequent clients load from existing storage
- Storage persists in Liveblocks (doesn't reset on reload)

To reset a room, delete it via the Liveblocks dashboard.

## Presence Details

Each user has:
- **Name**: Random name (Alex, Sam, Jordan, etc.)
- **Color**: Random color from palette (for cursor)
- **Cursor position**: Updated on every selection change
- **Selected IDs**: Array of currently selected entity IDs

To customize user info (e.g., from auth):
1. Update `LiveblocksRoom.tsx` to get user data from your auth system
2. Replace random name/color with real user info

## Troubleshooting

### "Liveblocks is not enabled" error

Make sure `VITE_LIVEBLOCKS_PUBLIC_KEY` is set in your environment.

### Changes not syncing

1. Check browser console for errors
2. Verify API key is valid
3. Check Liveblocks dashboard for connection status
4. Ensure all clients are in the same room

### Tests failing

Phase 6 tests are skipped if `VITE_LIVEBLOCKS_PUBLIC_KEY` is not set.

To run them:
```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx pnpm test:e2e:phase6
```

### Cursor not showing

1. Make sure you're clicking in the editor
2. Wait ~1 second for presence to sync
3. Check if `.collaboration-cursor__caret` element appears in DevTools

## Production Considerations

### Authentication

The current setup uses a **public API key** which is suitable for development but not production.

For production:
1. Use Liveblocks' authentication system
2. Generate access tokens server-side
3. Pass tokens to the client via `authEndpoint`

See: https://liveblocks.io/docs/authentication

### Rate Limits

Free tier has limits on:
- Concurrent connections
- Storage size
- Bandwidth

Monitor usage in the Liveblocks dashboard.

### Performance

- Presence updates are throttled to 16ms (60fps)
- Large documents may be slow - consider pagination
- Entity count should stay under 10,000 for good performance

## Debugging

Enable Liveblocks debug logs:

```typescript
// In src/liveblocks/config.ts
const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY!,
  throttle: 16,
  // Add this:
  logger: (level, message) => {
    console.log(`[Liveblocks ${level}]`, message);
  },
});
```

## Further Reading

- [Liveblocks Docs](https://liveblocks.io/docs)
- [TipTap Collaboration](https://tiptap.dev/docs/editor/extensions/functionality/collaboration)
- [Yjs CRDT](https://docs.yjs.dev/)
