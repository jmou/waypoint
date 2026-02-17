/**
 * Party — wrapper component for PartyKit collaboration.
 *
 * Handles:
 * - YPartyKitProvider connection (Yjs document sync + awareness)
 * - Entity sync via usePartyKitSync
 * - Loading states
 * - User info generation for cursors/presence
 */

import React, { ReactNode, useState, useEffect, useContext, createContext } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import { PARTYKIT_HOST, PARTYKIT_ENABLED } from "./config";
import type { UserInfo } from "./config";
import { usePartyKitSync } from "./sync";

// Context to pass provider + userInfo down to the editor
interface PartyContextValue {
  provider: YPartyKitProvider;
  yDoc: Y.Doc;
  userInfo: UserInfo;
}

const PartyContext = createContext<PartyContextValue | null>(null);
export const useParty = () => useContext(PartyContext);

// User colors for collaborative cursors
const USER_COLORS = [
  "#d06840", // warm orange
  "#4a8a5a", // green
  "#2d5f82", // blue
  "#a33d22", // red
  "#8a6840", // brown
  "#5a4a8a", // purple
];

const USER_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Morgan", "Taylor"];

function getRandomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function getRandomName() {
  return USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
}

interface PartyProps {
  roomId: string;
  children: ReactNode;
}

function PartyInner({ roomId, children, userInfo }: PartyProps & { userInfo: UserInfo }) {
  const [yDoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<YPartyKitProvider | null>(null);

  useEffect(() => {
    const ypProvider = new YPartyKitProvider(PARTYKIT_HOST, roomId, yDoc, {
      connect: true,
    });

    // Set user info in awareness (used by CollaborationCursor)
    ypProvider.awareness.setLocalStateField("user", {
      name: userInfo.name,
      color: userInfo.color,
    });

    setProvider(ypProvider);

    return () => {
      ypProvider.destroy();
    };
  }, [roomId, yDoc, userInfo]);

  // Run the entity/trip sync
  usePartyKitSync(yDoc);

  if (!provider) {
    return <LoadingScreen />;
  }

  return (
    <PartyContext.Provider value={{ provider, yDoc, userInfo }}>
      {children}
    </PartyContext.Provider>
  );
}

export function Party({ roomId, children }: PartyProps) {
  if (!PARTYKIT_ENABLED) {
    return <>{children}</>;
  }

  const [userInfo] = useState(() => ({
    name: getRandomName(),
    color: getRandomColor(),
  }));

  return (
    <PartyInner roomId={roomId} userInfo={userInfo}>
      {children}
    </PartyInner>
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
