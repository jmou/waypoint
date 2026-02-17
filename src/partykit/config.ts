/**
 * PartyKit configuration.
 *
 * For local development without collaboration, don't set VITE_PARTYKIT_HOST.
 * When set, the app connects to a PartyKit server for real-time collaboration.
 */

export const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || "";
export const PARTYKIT_ENABLED = !!PARTYKIT_HOST;

export type UserInfo = {
  name: string;
  color: string;
};
