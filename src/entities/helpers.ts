/**
 * Pure functions for entity graph traversal.
 * All functions take an entity map and return derived data.
 * No side effects — safe for use in render and in selection computation.
 */

import {
  Entity,
  EntityId,
  Experience,
  Place,
  PlaceId,
  Currency,
  CURRENCY_SYMBOLS,
  isPlace,
  isExperience,
} from "./types";

export type EntityMap = Map<EntityId, Entity>;

// ─── Hierarchy traversal ───

/** Get direct children of an entity (same type, matching parentId). */
export function getChildren(entities: EntityMap, parentId: EntityId): Entity[] {
  const parent = entities.get(parentId);
  if (!parent) return [];

  const result: Entity[] = [];
  for (const entity of entities.values()) {
    if (entity.type === parent.type && entity.parentId === parentId) {
      result.push(entity);
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get all descendants (children, grandchildren, etc.) excluding the entity itself. */
export function getDescendants(entities: EntityMap, id: EntityId): Set<EntityId> {
  const result = new Set<EntityId>();
  const entity = entities.get(id);
  if (!entity) return result;

  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const e of entities.values()) {
      if (e.type === entity.type && e.parentId === current && !result.has(e.id)) {
        result.add(e.id);
        queue.push(e.id);
      }
    }
  }
  return result;
}

/** Get ancestors from entity up to root. */
export function getAncestors(entities: EntityMap, id: EntityId): EntityId[] {
  const result: EntityId[] = [];
  let current = entities.get(id);
  while (current?.parentId) {
    result.push(current.parentId);
    current = entities.get(current.parentId);
  }
  return result;
}

/** Get root entities of a given type (no parent). */
export function getRoots(entities: EntityMap, type: "place" | "experience"): Entity[] {
  const result: Entity[] = [];
  for (const entity of entities.values()) {
    if (entity.type === type && entity.parentId === null) {
      result.push(entity);
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

// ─── Place-specific queries ───

/** Get all places (including children) under a place. */
export function getPlaceSubtree(entities: EntityMap, placeId: PlaceId): Set<PlaceId> {
  const result = new Set<PlaceId>([placeId]);
  const descendants = getDescendants(entities, placeId);
  for (const id of descendants) {
    if (entities.get(id)?.type === "place") {
      result.add(id);
    }
  }
  return result;
}

/** Get experiences associated with a place (or any of its children). */
export function getExperiencesAtPlace(
  entities: EntityMap,
  placeId: PlaceId
): Experience[] {
  const placeIds = getPlaceSubtree(entities, placeId);
  const result: Experience[] = [];
  for (const entity of entities.values()) {
    if (
      isExperience(entity) &&
      entity.placeIds.some((pid) => placeIds.has(pid))
    ) {
      result.push(entity);
    }
  }
  return result;
}

// ─── Cost aggregation ───

export interface CostBreakdown {
  byCurrency: Map<Currency, number>;
  total: string; // formatted: "¥111,400 + $120"
}

/** Aggregate costs for an entity and all its descendants. */
export function getSubtreeCost(entities: EntityMap, id: EntityId): CostBreakdown {
  const byCurrency = new Map<Currency, number>();

  const entity = entities.get(id);
  if (entity && isExperience(entity) && entity.amount != null) {
    byCurrency.set(entity.currency, (byCurrency.get(entity.currency) || 0) + entity.amount);
  }

  const descendants = getDescendants(entities, id);
  for (const descId of descendants) {
    const desc = entities.get(descId);
    if (desc && isExperience(desc) && desc.amount != null) {
      byCurrency.set(
        desc.currency,
        (byCurrency.get(desc.currency) || 0) + desc.amount
      );
    }
  }

  return { byCurrency, total: formatCostBreakdown(byCurrency) };
}

/** Aggregate costs for a set of entity IDs. */
export function aggregateCosts(
  entities: EntityMap,
  ids: Set<EntityId>
): CostBreakdown {
  const byCurrency = new Map<Currency, number>();
  for (const id of ids) {
    const entity = entities.get(id);
    if (entity && isExperience(entity) && entity.amount != null) {
      byCurrency.set(
        entity.currency,
        (byCurrency.get(entity.currency) || 0) + entity.amount
      );
    }
  }
  return { byCurrency, total: formatCostBreakdown(byCurrency) };
}

function formatCostBreakdown(byCurrency: Map<Currency, number>): string {
  if (byCurrency.size === 0) return "";
  return Array.from(byCurrency.entries())
    .map(([currency, amount]) => `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString()}`)
    .join(" + ");
}

// ─── Schedule queries ───

/** Parse a 12-hour time string like "2:00 PM" into minutes since midnight for sorting. */
function parseTimeToMinutes(time: string | null | undefined): number {
  if (!time) return 24 * 60; // null/undefined sorts last
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 24 * 60;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "AM" && hours === 12) hours = 0;
  else if (period === "PM" && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

/** Get experiences scheduled on a specific date. */
export function getExperiencesForDate(
  entities: EntityMap,
  date: string
): Experience[] {
  const result: Experience[] = [];
  for (const entity of entities.values()) {
    if (isExperience(entity) && entity.schedule?.date === date) {
      result.push(entity);
    }
  }
  return result.sort((a, b) =>
    parseTimeToMinutes(a.schedule?.time) - parseTimeToMinutes(b.schedule?.time)
  );
}

/** Get experiences with no schedule and no amount (not structural parents). */
export function getUnscheduledExperiences(entities: EntityMap): Experience[] {
  const result: Experience[] = [];
  for (const entity of entities.values()) {
    if (
      isExperience(entity) &&
      entity.schedule === null &&
      entity.amount === null &&
      entity.parentId !== null // exclude root
    ) {
      // Skip structural containers (entities that have children)
      const hasChildren = Array.from(entities.values()).some(
        (e) => e.type === "experience" && e.parentId === entity.id
      );
      if (!hasChildren) {
        result.push(entity);
      }
    }
  }
  return result;
}

/** Get all unique scheduled dates across all experiences. */
export function getScheduledDates(entities: EntityMap): Set<string> {
  const dates = new Set<string>();
  for (const entity of entities.values()) {
    if (isExperience(entity) && entity.schedule?.date) {
      dates.add(entity.schedule.date);
    }
  }
  return dates;
}

// ─── Selection & highlighting ───

/**
 * Compute highlighted entities from a selection set.
 *
 * Rules:
 * - Selected entity's descendants are highlighted
 * - Selected experience's associated places are highlighted
 * - Selected place's associated experiences (and child places' experiences) are highlighted
 * - Selected entities themselves are NOT in the highlighted set
 */
export function computeHighlighted(
  entities: EntityMap,
  selected: Set<EntityId>
): Set<EntityId> {
  const highlighted = new Set<EntityId>();

  for (const id of selected) {
    const entity = entities.get(id);
    if (!entity) continue;

    // Descendants are highlighted
    const descendants = getDescendants(entities, id);
    for (const d of descendants) highlighted.add(d);

    if (isExperience(entity)) {
      // Associated places are highlighted
      for (const placeId of entity.placeIds) {
        highlighted.add(placeId);
      }
    }

    if (isPlace(entity)) {
      // Experiences at this place (or child places) are highlighted
      const experiences = getExperiencesAtPlace(entities, id);
      for (const exp of experiences) {
        highlighted.add(exp.id);
      }
    }
  }

  // Remove selected entities from highlighted set — they are selected, not highlighted
  for (const id of selected) {
    highlighted.delete(id);
  }

  return highlighted;
}

// ─── Notes queries ───

/** Get all entity IDs mentioned in a set of block contents (for slash-command prioritization). */
export function getUnmentionedEntities(
  entities: EntityMap,
  mentionedIds: Set<EntityId>
): Entity[] {
  const result: Entity[] = [];
  for (const entity of entities.values()) {
    if (!mentionedIds.has(entity.id) && entity.parentId !== null) {
      result.push(entity);
    }
  }
  return result;
}
