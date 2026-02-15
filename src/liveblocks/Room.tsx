/**
 * LiveblocksRoom — wrapper component for Liveblocks RoomProvider.
 *
 * Handles:
 * - Room connection
 * - Initial storage setup
 * - Loading states
 * - Error states
 */

import React, { ReactNode, Suspense } from "react";
import { RoomProvider, LIVEBLOCKS_ENABLED, LiveMap, LiveObject } from "./config";
import { useLiveblocksSync, useInitializeStorage } from "./sync";
import { SEED_ENTITIES, SEED_TRIP } from "../entities/seed";
import type { Entity, Trip } from "../entities/types";

interface LiveblocksRoomProps {
  roomId: string;
  children: ReactNode;
}

// User colors for collaborative cursors
const USER_COLORS = [
  "#d06840", // warm orange
  "#4a8a5a", // green
  "#2d5f82", // blue
  "#a33d22", // red
  "#8a6840", // brown
  "#5a4a8a", // purple
];

function getRandomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function getRandomName() {
  const names = ["Alex", "Sam", "Jordan", "Casey", "Morgan", "Taylor"];
  return names[Math.floor(Math.random() * names.length)];
}

// Inner component that uses Liveblocks hooks
function RoomInner({ children }: { children: ReactNode }) {
  useLiveblocksSync();
  const initializeStorage = useInitializeStorage();

  // Initialize storage with seed data on first render
  React.useEffect(() => {
    initializeStorage({ entities: SEED_ENTITIES, trip: SEED_TRIP });
  }, [initializeStorage]);

  return <>{children}</>;
}

export function LiveblocksRoom({ roomId, children }: LiveblocksRoomProps) {
  if (!LIVEBLOCKS_ENABLED) {
    // Liveblocks disabled - render children directly
    return <>{children}</>;
  }

  // Generate user info for presence
  const [userInfo] = React.useState(() => ({
    name: getRandomName(),
    color: getRandomColor(),
  }));

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selectedIds: [],
        user: userInfo,
      }}
      initialStorage={{
        entities: new LiveMap<string, any>(),
        trip: null,
      }}
    >
      <Suspense fallback={<LoadingScreen />}>
        <RoomInner>{children}</RoomInner>
      </Suspense>
    </RoomProvider>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--color-background)",
        color: "var(--color-text-dim)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>
          Connecting to room...
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Setting up collaboration</div>
      </div>
    </div>
  );
}
