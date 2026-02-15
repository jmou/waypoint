/**
 * Liveblocks configuration.
 *
 * For local development, we run without Liveblocks (all state is local
 * via Zustand). When a VITE_LIVEBLOCKS_PUBLIC_KEY env var is set,
 * the app connects to a Liveblocks room for real-time collaboration.
 *
 * Architecture:
 * - Entity data → Liveblocks Storage (LiveMap<EntityId, LiveObject<Entity>>)
 * - Trip data → Liveblocks Storage (LiveObject<Trip>)
 * - Notes document → Liveblocks Yjs provider (TipTap Collaboration)
 * - Cursors → Liveblocks Presence (name, color, cursor position)
 * - Selection → Liveblocks Presence (selectedIds)
 */

import { createClient, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { Entity, Trip, EntityId } from "../entities/types";

export const LIVEBLOCKS_ENABLED = !!import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

// User info for presence
export type UserInfo = {
  name: string;
  color: string;
};

// Presence: what each user is doing right now
export type Presence = {
  cursor: { x: number; y: number; anchorX: number; anchorY: number } | null;
  selectedIds: EntityId[];
  user: UserInfo;
};

// Storage: shared, persistent state
export type Storage = {
  entities: LiveMap<EntityId, any>;
  trip: any;
};

// UserMeta: static user information (from auth)
export type UserMeta = {
  id: string;
  info: UserInfo;
};

// Create the Liveblocks client only if enabled
let client: ReturnType<typeof createClient> | null = null;

if (LIVEBLOCKS_ENABLED) {
  client = createClient({
    publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY!,
    // Throttle presence updates to reduce network traffic
    throttle: 16, // 60fps
  });
}

// Default exports for when Liveblocks is disabled
const noop = () => {
  throw new Error("Liveblocks is not enabled. Set VITE_LIVEBLOCKS_PUBLIC_KEY.");
};

// Create room context
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useSelf,
    useStorage,
    useMutation,
  },
} = client
  ? createRoomContext<Presence, Storage, UserMeta, any>(client)
  : {
      suspense: {
        RoomProvider: noop as any,
        useRoom: noop as any,
        useMyPresence: noop as any,
        useUpdateMyPresence: noop as any,
        useOthers: noop as any,
        useSelf: noop as any,
        useStorage: noop as any,
        useMutation: noop as any,
      },
    };

export { client, LiveMap, LiveObject };
