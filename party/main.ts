/**
 * PartyKit server for Waypoint.
 *
 * Delegates entirely to y-partykit for Yjs document sync.
 * The Yjs document contains:
 * - TipTap rich text (Y.XmlFragment "default")
 * - Entity data (Y.Map "entities")
 * - Trip data (Y.Map "trip")
 *
 * Persistence via Cloudflare Durable Objects snapshots.
 */

import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class WaypointServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    return onConnect(conn, this.room, {
      persist: { mode: "snapshot" },
    });
  }
}
