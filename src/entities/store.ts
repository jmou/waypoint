/**
 * Entity store using Zustand.
 *
 * This is the local, synchronous store. In production, mutations will be
 * mirrored to Liveblocks Storage (LiveMap<EntityId, Entity>) so that
 * every collaborator sees the same entity graph.
 *
 * The store is deliberately "dumb" — it holds data and exposes mutations.
 * All derived data (descendants, costs, highlights) is computed via
 * helpers.ts functions, called from components or selectors.
 */

import { create } from "zustand";
import {
  Entity,
  EntityId,
  Place,
  Experience,
  Trip,
  TripId,
  PlaceId,
  ExperienceId,
  Schedule,
  Currency,
  createPlace,
  createExperience,
} from "./types";
import { EntityMap } from "./helpers";

// ─── Store shape ───

interface EntityStore {
  // Data
  entities: EntityMap;
  trip: Trip | null;

  // Mutations — places
  addPlace: (name: string, parentId: PlaceId | null) => PlaceId;
  updatePlace: (id: PlaceId, updates: Partial<Pick<Place, "name" | "parentId" | "coords" | "sortOrder">>) => void;
  removePlace: (id: PlaceId) => void;

  // Mutations — experiences
  addExperience: (name: string, parentId: ExperienceId | null) => ExperienceId;
  updateExperience: (id: ExperienceId, updates: Partial<Pick<Experience, "name" | "parentId" | "placeIds" | "schedule" | "amount" | "currency" | "sortOrder">>) => void;
  removeExperience: (id: ExperienceId) => void;

  // Mutations — generic
  removeEntity: (id: EntityId) => void;
  reparent: (id: EntityId, newParentId: EntityId | null) => void;
  moveTo: (id: EntityId, newParentId: EntityId | null, index: number) => void;

  // Trip
  setTrip: (trip: Trip) => void;
  updateTrip: (updates: Partial<Pick<Trip, "name" | "dateRange" | "timezone">>) => void;

  // Hydration (for loading from Liveblocks or seed data)
  hydrate: (entities: Entity[], trip: Trip) => void;
}

const USER_ID = "local-user"; // placeholder until auth

export const useEntityStore = create<EntityStore>((set, get) => ({
  entities: new Map(),
  trip: null,

  addPlace: (name, parentId) => {
    const trip = get().trip;
    if (!trip) throw new Error("No trip loaded");
    const place = createPlace(trip.id, name, parentId, USER_ID, {
      sortOrder: getNextSortOrder(get().entities, parentId, "place"),
    });
    set((state) => {
      const next = new Map(state.entities);
      next.set(place.id, place);
      return { entities: next };
    });
    return place.id;
  },

  updatePlace: (id, updates) => {
    set((state) => {
      const entity = state.entities.get(id);
      if (!entity || entity.type !== "place") return state;
      const next = new Map(state.entities);
      next.set(id, { ...entity, ...updates });
      return { entities: next };
    });
  },

  removePlace: (id) => get().removeEntity(id),

  addExperience: (name, parentId) => {
    const trip = get().trip;
    if (!trip) throw new Error("No trip loaded");
    const exp = createExperience(trip.id, name, parentId, USER_ID, {
      sortOrder: getNextSortOrder(get().entities, parentId, "experience"),
    });
    set((state) => {
      const next = new Map(state.entities);
      next.set(exp.id, exp);
      return { entities: next };
    });
    return exp.id;
  },

  updateExperience: (id, updates) => {
    set((state) => {
      const entity = state.entities.get(id);
      if (!entity || entity.type !== "experience") return state;
      const next = new Map(state.entities);
      next.set(id, { ...entity, ...updates });
      return { entities: next };
    });
  },

  removeExperience: (id) => get().removeEntity(id),

  removeEntity: (id) => {
    set((state) => {
      const next = new Map(state.entities);
      // Remove entity and all descendants
      const toRemove = [id];
      while (toRemove.length > 0) {
        const current = toRemove.pop()!;
        const entity = next.get(current);
        if (!entity) continue;
        next.delete(current);
        // Find children
        for (const [childId, child] of next) {
          if (child.parentId === current && child.type === entity.type) {
            toRemove.push(childId);
          }
        }
      }
      return { entities: next };
    });
  },

  reparent: (id, newParentId) => {
    set((state) => {
      const entity = state.entities.get(id);
      if (!entity) return state;
      const next = new Map(state.entities);
      next.set(id, {
        ...entity,
        parentId: newParentId,
        sortOrder: getNextSortOrder(next, newParentId, entity.type),
      } as Entity);
      return { entities: next };
    });
  },

  moveTo: (id, newParentId, index) => {
    set((state) => {
      const entity = state.entities.get(id);
      if (!entity) return state;

      // Prevent moving into self
      if (newParentId === id) return state;

      // Prevent moving into own descendants
      if (newParentId !== null) {
        let cursor = state.entities.get(newParentId);
        while (cursor) {
          if (cursor.id === id) return state;
          cursor = cursor.parentId ? state.entities.get(cursor.parentId) : undefined;
        }
      }

      // Get siblings at target parent, excluding the entity being moved
      const siblings: Entity[] = [];
      for (const e of state.entities.values()) {
        if (e.type === entity.type && e.parentId === newParentId && e.id !== id) {
          siblings.push(e);
        }
      }
      siblings.sort((a, b) => a.sortOrder - b.sortOrder);

      // Insert at the specified index
      const clampedIndex = Math.max(0, Math.min(index, siblings.length));
      siblings.splice(clampedIndex, 0, entity);

      // Renumber all siblings and update the moved entity's parentId
      const next = new Map(state.entities);
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        const current = next.get(sibling.id)!;
        if (sibling.id === id) {
          next.set(id, { ...current, parentId: newParentId, sortOrder: i } as Entity);
        } else if (current.sortOrder !== i) {
          next.set(sibling.id, { ...current, sortOrder: i } as Entity);
        }
      }

      return { entities: next };
    });
  },

  setTrip: (trip) => set({ trip }),

  updateTrip: (updates) => {
    set((state) => {
      if (!state.trip) return state;
      return { trip: { ...state.trip, ...updates } };
    });
  },

  hydrate: (entities, trip) => {
    const map = new Map<EntityId, Entity>();
    for (const entity of entities) {
      map.set(entity.id, entity);
    }
    set({ entities: map, trip });
  },
}));

// ─── Helpers ───

function getNextSortOrder(
  entities: EntityMap,
  parentId: EntityId | null,
  type: "place" | "experience"
): number {
  let max = -1;
  for (const entity of entities.values()) {
    if (entity.type === type && entity.parentId === parentId) {
      max = Math.max(max, entity.sortOrder);
    }
  }
  return max + 1;
}
