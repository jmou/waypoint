/**
 * Selection store.
 *
 * Manages the set of explicitly selected entity IDs.
 * Highlighted entities are derived (computed in components via helpers.ts).
 *
 * Selection rules:
 * - Plain click: replace selection with single entity (toggle off if already sole selection)
 * - Ctrl/Cmd+click: toggle entity in/out of multi-selection
 * - Day click: select all experiences on that date (replace or add depending on modifier)
 */

import { create } from "zustand";
import { EntityId } from "./types";

interface SelectionStore {
  selected: Set<EntityId>;

  /** Select a single entity, replacing current selection. Toggle off if already sole. */
  select: (id: EntityId) => void;

  /** Toggle an entity in/out of the current selection (Ctrl+click behavior). */
  toggle: (id: EntityId) => void;

  /** Handle a click event, auto-detecting modifier keys. */
  handleClick: (id: EntityId, event?: { ctrlKey?: boolean; metaKey?: boolean }) => void;

  /** Replace selection with a set of IDs (e.g., all experiences on a date). */
  selectMany: (ids: EntityId[]) => void;

  /** Add IDs to existing selection (Ctrl+day-click). */
  addMany: (ids: EntityId[]) => void;

  /** Handle day-click: select all given IDs, respecting modifiers. */
  handleDayClick: (ids: EntityId[], event?: { ctrlKey?: boolean; metaKey?: boolean }) => void;

  /** Clear all selection. */
  clear: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selected: new Set(),

  select: (id) =>
    set((state) => {
      if (state.selected.size === 1 && state.selected.has(id)) {
        return { selected: new Set() };
      }
      return { selected: new Set([id]) };
    }),

  toggle: (id) =>
    set((state) => {
      const next = new Set(state.selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selected: next };
    }),

  handleClick: (id, event) =>
    set((state) => {
      const additive = event?.ctrlKey || event?.metaKey;
      if (additive) {
        const next = new Set(state.selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selected: next };
      } else {
        if (state.selected.size === 1 && state.selected.has(id)) {
          return { selected: new Set() };
        }
        return { selected: new Set([id]) };
      }
    }),

  selectMany: (ids) =>
    set({ selected: new Set(ids) }),

  addMany: (ids) =>
    set((state) => {
      const next = new Set(state.selected);
      for (const id of ids) next.add(id);
      return { selected: next };
    }),

  handleDayClick: (ids, event) =>
    set((state) => {
      if (ids.length === 0) return state;
      const additive = event?.ctrlKey || event?.metaKey;
      if (additive) {
        const next = new Set(state.selected);
        for (const id of ids) next.add(id);
        return { selected: next };
      }
      return { selected: new Set(ids) };
    }),

  clear: () => set({ selected: new Set() }),
}));
