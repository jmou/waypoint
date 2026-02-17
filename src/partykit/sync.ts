/**
 * PartyKit sync layer.
 *
 * Bidirectional sync between Zustand entity store and Yjs Y.Map:
 * - Local Zustand mutations → update Y.Map entries
 * - Remote Y.Map changes → hydrate Zustand store
 *
 * Entity data lives in yDoc.getMap("entities") as plain JSON objects.
 * Trip data lives in yDoc.getMap("trip") under the key "data".
 *
 * This hook should be called once at the app root when PartyKit is enabled.
 */

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { useEntityStore } from "../entities/store";
import type { Entity, Trip, EntityId } from "../entities/types";
import { SEED_ENTITIES, SEED_TRIP } from "../entities/seed";

export function usePartyKitSync(yDoc: Y.Doc | null) {
  const entities = useEntityStore((s) => s.entities);
  const trip = useEntityStore((s) => s.trip);
  const hydrate = useEntityStore((s) => s.hydrate);

  const prevEntitiesRef = useRef<Map<EntityId, Entity>>(new Map());
  const prevTripRef = useRef<Trip | null>(null);
  const suppressOutgoingRef = useRef(false);
  const initializedRef = useRef(false);

  // Hydrate Zustand from Yjs on initial sync, and observe remote changes
  useEffect(() => {
    if (!yDoc) return;

    const yEntities = yDoc.getMap<Record<string, unknown>>("entities");
    const yTrip = yDoc.getMap<unknown>("trip");

    // Try to hydrate from existing Yjs state (another client may have seeded)
    const tryHydrate = () => {
      if (yEntities.size > 0 && yTrip.get("data")) {
        const entityList: Entity[] = [];
        yEntities.forEach((val, key) => {
          entityList.push(val as unknown as Entity);
        });
        const tripData = yTrip.get("data") as Trip;

        suppressOutgoingRef.current = true;
        hydrate(entityList, tripData);
        prevEntitiesRef.current = new Map(entityList.map((e) => [e.id, e]));
        prevTripRef.current = tripData;
        initializedRef.current = true;
        // Release suppression after microtask to avoid echo
        queueMicrotask(() => {
          suppressOutgoingRef.current = false;
        });
        return true;
      }
      return false;
    };

    // If Yjs already has data (e.g. from persistence), hydrate immediately
    if (!tryHydrate()) {
      // No data yet — seed the Yjs doc with initial data
      yDoc.transact(() => {
        for (const entity of SEED_ENTITIES) {
          yEntities.set(entity.id, entity as unknown as Record<string, unknown>);
        }
        yTrip.set("data", SEED_TRIP as unknown);
      });

      // Also hydrate Zustand locally
      hydrate(SEED_ENTITIES, SEED_TRIP);
      prevEntitiesRef.current = new Map(SEED_ENTITIES.map((e) => [e.id, e]));
      prevTripRef.current = SEED_TRIP;
      initializedRef.current = true;
    }

    // Observe remote entity changes
    const entityObserver = () => {
      if (suppressOutgoingRef.current) return;

      const entityList: Entity[] = [];
      yEntities.forEach((val) => {
        entityList.push(val as unknown as Entity);
      });
      const tripData = yTrip.get("data") as Trip | undefined;
      const currentTrip = tripData || useEntityStore.getState().trip;

      if (!currentTrip) return;

      // Only update if there are actual differences
      const currentMap = new Map(entityList.map((e) => [e.id, e]));
      const storeEntities = useEntityStore.getState().entities;

      if (mapsEqual(currentMap, storeEntities)) return;

      suppressOutgoingRef.current = true;
      hydrate(entityList, currentTrip);
      prevEntitiesRef.current = currentMap;
      prevTripRef.current = currentTrip;
      queueMicrotask(() => {
        suppressOutgoingRef.current = false;
      });
    };

    // Observe remote trip changes
    const tripObserver = () => {
      if (suppressOutgoingRef.current) return;

      const tripData = yTrip.get("data") as Trip | undefined;
      if (!tripData) return;

      const storeTripJson = JSON.stringify(useEntityStore.getState().trip);
      const remoteTripJson = JSON.stringify(tripData);
      if (storeTripJson === remoteTripJson) return;

      suppressOutgoingRef.current = true;
      const entityList = Array.from(useEntityStore.getState().entities.values());
      hydrate(entityList, tripData);
      prevTripRef.current = tripData;
      queueMicrotask(() => {
        suppressOutgoingRef.current = false;
      });
    };

    yEntities.observeDeep(entityObserver);
    yTrip.observeDeep(tripObserver);

    return () => {
      yEntities.unobserveDeep(entityObserver);
      yTrip.unobserveDeep(tripObserver);
    };
  }, [yDoc, hydrate]);

  // Sync local entity changes → Yjs
  useEffect(() => {
    if (!yDoc || !initializedRef.current || suppressOutgoingRef.current) return;

    const yEntities = yDoc.getMap<Record<string, unknown>>("entities");
    const prev = prevEntitiesRef.current;

    const toAdd: Entity[] = [];
    const toUpdate: Entity[] = [];
    const toDelete: string[] = [];

    // Find added/updated
    for (const [id, entity] of entities) {
      const prevEntity = prev.get(id);
      if (!prevEntity) {
        toAdd.push(entity);
      } else if (JSON.stringify(prevEntity) !== JSON.stringify(entity)) {
        toUpdate.push(entity);
      }
    }

    // Find deleted
    for (const [id] of prev) {
      if (!entities.has(id)) {
        toDelete.push(id);
      }
    }

    if (toAdd.length === 0 && toUpdate.length === 0 && toDelete.length === 0) return;

    suppressOutgoingRef.current = true;
    yDoc.transact(() => {
      for (const entity of toAdd) {
        yEntities.set(entity.id, entity as unknown as Record<string, unknown>);
      }
      for (const entity of toUpdate) {
        yEntities.set(entity.id, entity as unknown as Record<string, unknown>);
      }
      for (const id of toDelete) {
        yEntities.delete(id);
      }
    });
    prevEntitiesRef.current = new Map(entities);
    queueMicrotask(() => {
      suppressOutgoingRef.current = false;
    });
  }, [entities, yDoc]);

  // Sync local trip changes → Yjs
  useEffect(() => {
    if (!yDoc || !initializedRef.current || suppressOutgoingRef.current || !trip) return;

    const prevTrip = prevTripRef.current;
    if (prevTrip && JSON.stringify(prevTrip) === JSON.stringify(trip)) return;

    const yTrip = yDoc.getMap<unknown>("trip");

    suppressOutgoingRef.current = true;
    yTrip.set("data", trip as unknown);
    prevTripRef.current = trip;
    queueMicrotask(() => {
      suppressOutgoingRef.current = false;
    });
  }, [trip, yDoc]);
}

/** Shallow compare two entity maps by JSON-serializing each entry. */
function mapsEqual(a: Map<EntityId, Entity>, b: Map<EntityId, Entity>): boolean {
  if (a.size !== b.size) return false;
  for (const [id, entity] of a) {
    const other = b.get(id);
    if (!other || JSON.stringify(entity) !== JSON.stringify(other)) return false;
  }
  return true;
}
