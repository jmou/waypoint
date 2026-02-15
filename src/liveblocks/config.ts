/**
 * Liveblocks configuration.
 *
 * For local development, we run without Liveblocks (all state is local
 * via Zustand). When a VITE_LIVEBLOCKS_PUBLIC_KEY env var is set,
 * the app connects to a Liveblocks room for real-time collaboration.
 *
 * The plan:
 * - Entity data → Liveblocks Storage (LiveMap<EntityId, Entity>)
 * - Notes document → Liveblocks Yjs provider (TipTap Collaboration)
 * - Cursors → Liveblocks Presence
 *
 * This file exports a flag and the client instance. The actual
 * <RoomProvider> wrapper goes in App.tsx when Liveblocks is enabled.
 */

// import { createClient } from "@liveblocks/client";
// import { createRoomContext } from "@liveblocks/react";

export const LIVEBLOCKS_ENABLED = !!import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

// When ready, uncomment and configure:
//
// const client = createClient({
//   publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY!,
// });
//
// type Presence = {
//   cursor: { x: number; y: number } | null;
//   name: string;
//   color: string;
//   selectedIds: string[];
// };
//
// type Storage = {
//   entities: LiveMap<string, LiveObject<Entity>>;
// };
//
// export const {
//   RoomProvider,
//   useRoom,
//   useMyPresence,
//   useOthers,
//   useStorage,
//   useMutation,
// } = createRoomContext<Presence, Storage>(client);

export {};
