/**
 * Core entity model for Waypoint.
 *
 * Two entity types with rigid schemas:
 * - Place: locatable (has coordinates), strict tree hierarchy (single parent)
 * - Experience: temporal (schedulable), DAG via labels, optional amount (expense)
 *
 * Relationships:
 * - Place hierarchy: strict tree (parent field)
 * - Experience hierarchy: strict tree (parent field), DAG via labels (future)
 * - Experience → Place: many-to-many (places array)
 */

// ─── Entity IDs ───

export type EntityId = string; // UUID v4
export type PlaceId = EntityId;
export type ExperienceId = EntityId;
export type TripId = string; // top-level container

// ─── Place ───

export interface Place {
  id: PlaceId;
  type: "place";
  tripId: TripId;
  name: string;
  parentId: PlaceId | null; // strict tree — single parent
  coords: Coordinates | null;
  sortOrder: number; // for manual ordering within siblings
  createdAt: string; // ISO 8601
  createdBy: string; // user ID
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// ─── Experience ───

export interface Experience {
  id: ExperienceId;
  type: "experience";
  tripId: TripId;
  name: string;
  parentId: ExperienceId | null; // hierarchy parent
  placeIds: PlaceId[]; // associated places
  schedule: Schedule | null; // when it happens
  amount: number | null; // cost (null = not an expense)
  currency: Currency; // default JPY
  sortOrder: number;
  createdAt: string;
  createdBy: string;
}

export interface Schedule {
  date: string; // ISO date: "2026-03-15"
  time: string | null; // display time: "2:00 PM" (null = all-day)
  timezone: string; // IANA: "Asia/Tokyo"
}

export type Currency = "JPY" | "USD" | "EUR" | "GBP" | "AUD";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  JPY: "¥",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
};

// ─── Union type ───

export type Entity = Place | Experience;

// ─── Type guards ───

export function isPlace(entity: Entity): entity is Place {
  return entity.type === "place";
}

export function isExperience(entity: Entity): entity is Experience {
  return entity.type === "experience";
}

// ─── Trip (top-level container) ───

export interface Trip {
  id: TripId;
  name: string;
  dateRange: {
    start: string; // ISO date
    end: string;
  };
  timezone: string;
  createdAt: string;
  createdBy: string;
  collaborators: string[];
}

// ─── Factory functions ───

let _counter = 0;
function generateId(): string {
  // In production, use uuid v4. This is a fallback.
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${++_counter}`;
}

export function createPlace(
  tripId: TripId,
  name: string,
  parentId: PlaceId | null,
  userId: string,
  overrides?: Partial<Place>
): Place {
  return {
    id: generateId(),
    type: "place",
    tripId,
    name,
    parentId,
    coords: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    ...overrides,
  };
}

export function createExperience(
  tripId: TripId,
  name: string,
  parentId: ExperienceId | null,
  userId: string,
  overrides?: Partial<Experience>
): Experience {
  return {
    id: generateId(),
    type: "experience",
    tripId,
    name,
    parentId,
    placeIds: [],
    schedule: null,
    amount: null,
    currency: "JPY",
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    ...overrides,
  };
}
