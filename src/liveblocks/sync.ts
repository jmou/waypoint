/**
 * Liveblocks sync layer.
 *
 * Bidirectional sync between Zustand stores and Liveblocks Storage:
 * - Local Zustand mutations → update LiveMap
 * - Remote LiveMap changes → update Zustand store
 *
 * This hook should be called once at the app root when Liveblocks is enabled.
 */

import { useEffect, useRef } from "react";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { useMutation, useStorage, useUpdateMyPresence, LiveObject, LiveMap } from "./config";
import type { Entity, Trip, EntityId } from "../entities/types";

/**
 * Sync Zustand entity store with Liveblocks Storage.
 *
 * Strategy:
 * 1. On mount: hydrate Zustand from Liveblocks Storage
 * 2. On Zustand mutation: detect changes and update LiveMap
 * 3. On LiveMap remote change: update Zustand
 */
export function useLiveblocksSync() {
  const entities = useEntityStore((s) => s.entities);
  const trip = useEntityStore((s) => s.trip);
  const hydrate = useEntityStore((s) => s.hydrate);
  const selected = useSelectionStore((s) => s.selected);
  const updateMyPresence = useUpdateMyPresence();

  const prevEntitiesRef = useRef<Map<EntityId, Entity>>(new Map());
  const isHydratedRef = useRef(false);

  // Hydrate Zustand from Liveblocks on mount
  const liveEntities = useStorage((root: any) => root.entities);
  const liveTrip = useStorage((root: any) => root.trip);

  useEffect(() => {
    if (isHydratedRef.current) return;
    if (!liveEntities || !liveTrip) return;

    const entities: Entity[] = [];
    liveEntities.forEach((liveEntity: any) => {
      entities.push(liveEntity.toObject() as Entity);
    });

    const trip = liveTrip.toObject() as Trip;
    hydrate(entities, trip);
    prevEntitiesRef.current = new Map(
      entities.map((e) => [e.id, e])
    );
    isHydratedRef.current = true;
  }, [liveEntities, liveTrip, hydrate]);

  // Sync Zustand → Liveblocks (local mutations)
  const syncToLiveblocks = useMutation(({ storage }: any, entities: Map<EntityId, Entity>) => {
    const liveEntities = storage.get("entities");
    if (!liveEntities) return;

    const prev = prevEntitiesRef.current;

    // Find added/updated entities
    for (const [id, entity] of entities) {
      const prevEntity = prev.get(id);
      if (!prevEntity) {
        // Added
        liveEntities.set(id, new LiveObject(entity as any));
      } else if (JSON.stringify(prevEntity) !== JSON.stringify(entity)) {
        // Updated
        const liveEntity = liveEntities.get(id);
        if (liveEntity) {
          // Update all fields
          Object.keys(entity).forEach((key) => {
            liveEntity.set(key as any, (entity as any)[key]);
          });
        } else {
          liveEntities.set(id, new LiveObject(entity as any));
        }
      }
    }

    // Find removed entities
    for (const [id] of prev) {
      if (!entities.has(id)) {
        liveEntities.delete(id);
      }
    }

    prevEntitiesRef.current = new Map(entities);
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    syncToLiveblocks(entities);
  }, [entities, syncToLiveblocks]);

  // Sync Liveblocks → Zustand (remote changes)
  useEffect(() => {
    if (!liveEntities) return;

    const unsubscribe = liveEntities.subscribe(() => {
      if (!isHydratedRef.current) return;

      const entities: Entity[] = [];
      liveEntities.forEach((liveEntity: any) => {
        entities.push(liveEntity.toObject() as Entity);
      });

      const currentMap = new Map(entities.map((e) => [e.id, e]));
      const storeMap = useEntityStore.getState().entities;

      // Only update if there are actual changes
      if (JSON.stringify(Array.from(currentMap)) !== JSON.stringify(Array.from(storeMap))) {
        const trip = useEntityStore.getState().trip;
        if (trip) {
          hydrate(entities, trip);
          prevEntitiesRef.current = currentMap;
        }
      }
    });

    return unsubscribe;
  }, [liveEntities, hydrate]);

  // Sync trip changes
  const syncTripToLiveblocks = useMutation(({ storage }: any, trip: Trip | null) => {
    if (!trip) return;
    const liveTrip = storage.get("trip");
    if (liveTrip) {
      Object.keys(trip).forEach((key) => {
        liveTrip.set(key as any, (trip as any)[key]);
      });
    } else {
      storage.set("trip", new LiveObject(trip as any));
    }
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current || !trip) return;
    syncTripToLiveblocks(trip);
  }, [trip, syncTripToLiveblocks]);

  // Sync selection to presence
  useEffect(() => {
    updateMyPresence({
      selectedIds: Array.from(selected),
    });
  }, [selected, updateMyPresence]);
}

/**
 * Initialize Liveblocks Storage with default values.
 * Called once when creating a new room.
 */
export function useInitializeStorage() {
  return useMutation(({ storage }: any, { entities, trip }: { entities: Entity[]; trip: Trip }) => {
    const liveEntities = storage.get("entities");
    if (liveEntities && liveEntities.size > 0) {
      // Already initialized
      return;
    }

    // Initialize entities
    const entityMap = new LiveMap<EntityId, any>();
    entities.forEach((entity) => {
      entityMap.set(entity.id, new LiveObject(entity as any));
    });
    storage.set("entities", entityMap);

    // Initialize trip
    storage.set("trip", new LiveObject(trip as any));
  }, []);
}
