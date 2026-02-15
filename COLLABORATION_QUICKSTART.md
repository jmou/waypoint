# Collaboration Quick Start

Get Waypoint's real-time collaboration up and running in 5 minutes.

## Step 1: Get a Liveblocks API Key

1. Go to https://liveblocks.io/
2. Sign up (free tier is fine)
3. Create a new project
4. Copy your **Public API Key** from the dashboard

## Step 2: Configure Your Environment

Create a `.env` file in the project root:

```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_key_here
```

Or export it in your shell:

```bash
export VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_key_here
```

## Step 3: Start the App

```bash
pnpm dev
```

Open http://localhost:3000

## Step 4: Test Collaboration

Open the app in **two browser windows** (side by side):

### Test 1: Entity Sync
1. In window 1: Go to Places view, add a new place
2. In window 2: Switch to Places view → new place appears!

### Test 2: Document Collaboration
1. In window 1: Click in the notes editor, type some text
2. In window 2: See the text appear as you type!

### Test 3: Cursors
1. In window 1: Click in the notes editor
2. In window 2: See a colored cursor bar with a name label

### Test 4: Selection Sync
1. In window 1: Click an entity chip
2. In window 2: See the selection in presence (implementation dependent)

## Step 5: Verify Tests Pass

```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx pnpm test:e2e:phase6
```

## Troubleshooting

### "Connecting to room..." stays forever
- Check your API key is correct
- Check network connection
- Check Liveblocks dashboard for issues

### Changes not syncing
- Wait 1-2 seconds for sync
- Check browser console for errors
- Verify both windows are in the same room

### No cursor showing
- Click in the notes editor to set position
- Wait ~1 second for presence sync
- Check if `.collaboration-cursor__caret` element exists in DevTools

## Local-Only Mode

To work without Liveblocks (no collaboration):

```bash
# Just don't set the env var
pnpm dev
```

Everything works locally, but no real-time sync.

## Next Steps

- Read [LIVEBLOCKS.md](./LIVEBLOCKS.md) for full documentation
- Read [PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md) for implementation details
- Check [e2e/phase6.spec.ts](./e2e/phase6.spec.ts) for test examples

## Production Deployment

For production:
1. Set up Liveblocks authentication (not public key)
2. Generate access tokens server-side
3. Monitor usage in Liveblocks dashboard

See [LIVEBLOCKS.md](./LIVEBLOCKS.md) for production considerations.

---

That's it! You now have real-time collaboration working in Waypoint.
