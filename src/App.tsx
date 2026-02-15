/**
 * App — root component.
 *
 * Hydrates the entity store with seed data on mount, then renders
 * the two-pane layout. Currently only the Notes editor is live;
 * other views (Map, Schedule, Expenses, Places, Experiences) are
 * stubs ready to be built out.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useEntityStore } from "./entities/store";
import { useSelectionStore } from "./entities/selection";
import { computeHighlighted } from "./entities/helpers";
import { isExperience, CURRENCY_SYMBOLS, Entity } from "./entities/types";
import { SEED_ENTITIES, SEED_TRIP, SEED_DOCUMENT } from "./entities/seed";
import { NotesEditor } from "./editor/NotesEditor";
import { NavigationProvider } from "./context/NavigationContext";
import { Chip } from "./components/Chip";
import { PlacesView } from "./components/PlacesView";
import { ExperiencesView } from "./components/ExperiencesView";
import "./styles.css";

type LeftTab = "map" | "schedule" | "expenses";
type RightTab = "notes" | "places" | "experiences";

export default function App() {
  const hydrate = useEntityStore((s) => s.hydrate);
  const entities = useEntityStore((s) => s.entities);
  const trip = useEntityStore((s) => s.trip);
  const selected = useSelectionStore((s) => s.selected);
  const clearSelection = useSelectionStore((s) => s.clear);

  const [leftTab, setLeftTab] = useState<LeftTab>("map");
  const [rightTab, setRightTab] = useState<RightTab>("notes");
  const [ready, setReady] = useState(false);

  // Hydrate store on mount
  useEffect(() => {
    hydrate(SEED_ENTITIES, SEED_TRIP);
    setReady(true);
  }, [hydrate]);

  const highlighted = computeHighlighted(entities, selected);

  const handleNavigate = useCallback((view: string) => {
    if (["map", "schedule", "expenses"].includes(view)) setLeftTab(view as LeftTab);
    else if (["notes", "places", "experiences"].includes(view)) setRightTab(view as RightTab);
  }, []);

  if (!ready || !trip) return null;

  return (
    <NavigationProvider onNavigate={handleNavigate}>
      <div className="app">
        {/* ─── Title bar ─── */}
        <header className="titlebar">
          <span className="titlebar__name">{trip.name}</span>
          <div style={{ flex: 1 }} />
          <div className="titlebar__avatars">
            <div className="avatar" style={{ background: "#d06840" }}>K</div>
            <div className="avatar" style={{ background: "#4a8a5a", marginLeft: -4 }}>M</div>
          </div>
        </header>

        {/* ─── Two-pane body ─── */}
        <div className="panes">
          {/* Left pane: visualization */}
          <div className="pane pane--left">
            <TabBar
              tabs={[
                { id: "map", label: "Map" },
                { id: "schedule", label: "Schedule" },
                { id: "expenses", label: "Expenses" },
              ]}
              active={leftTab}
              onSelect={(id) => setLeftTab(id as LeftTab)}
            />
            <div className="pane__content">
              {leftTab === "map" && <PlaceholderView label="Map" description="Drag pins, see selections light up" />}
              {leftTab === "schedule" && <PlaceholderView label="Schedule" description="Drag experiences between dates" />}
              {leftTab === "expenses" && <PlaceholderView label="Expenses" description="Inline-editable amounts with currency picker" />}
            </div>
          </div>

          {/* Right pane: authoring */}
          <div className="pane pane--right">
            <TabBar
              tabs={[
                { id: "notes", label: "Notes" },
                { id: "places", label: "Places" },
                { id: "experiences", label: "Experiences" },
              ]}
              active={rightTab}
              onSelect={(id) => setRightTab(id as RightTab)}
            />
            <div className="pane__content">
              {rightTab === "notes" && (
                <NotesEditor
                  initialContent={SEED_DOCUMENT}
                  onNavigate={handleNavigate}
                />
              )}
              {rightTab === "places" && <PlacesView />}
              {rightTab === "experiences" && <ExperiencesView />}
            </div>
          </div>
        </div>

        {/* ─── Selection popover ─── */}
        {selected.size > 0 && (
          <SelectionPopover
            selected={selected}
            entities={entities}
            onNavigate={handleNavigate}
            onClear={clearSelection}
          />
        )}
      </div>
    </NavigationProvider>
  );
}

// ─── Tab bar ───

function TabBar({ tabs, active, onSelect }: {
  tabs: { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tabbar__tab ${active === tab.id ? "tabbar__tab--active" : ""}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Selection popover (full Chip component with indicators) ───

function SelectionPopover({ selected, entities, onNavigate, onClear }: {
  selected: Set<string>;
  entities: Map<string, Entity>;
  onNavigate: (view: string) => void;
  onClear: () => void;
}) {
  const handleClick = useSelectionStore((s) => s.handleClick);
  const ids = Array.from(selected);

  return (
    <div className="selection-popover">
      {ids.slice(0, 8).map((id) => {
        const ent = entities.get(id);
        if (!ent) return null;

        const isExp = isExperience(ent);
        const hasPlace = isExp && ent.placeIds.length > 0;
        let placeName: string | null = null;
        if (hasPlace && isExp) {
          const place = entities.get(ent.placeIds[0]);
          if (place) placeName = place.name;
        }
        const currencySymbol = isExp ? CURRENCY_SYMBOLS[ent.currency] || "$" : "$";

        return (
          <Chip
            key={id}
            type={ent.type}
            selected={true}
            onClick={() => handleClick(id, { ctrlKey: true, metaKey: true })}
            scheduled={isExp && ent.schedule !== null}
            amount={isExp ? ent.amount : null}
            currencySymbol={currencySymbol}
            placeName={placeName}
            onClockClick={() => onNavigate("schedule")}
            onExpenseClick={() => onNavigate("expenses")}
            onPlaceIconClick={() => onNavigate("map")}
          >
            {ent.name}
          </Chip>
        );
      })}
      {ids.length > 8 && (
        <span style={{ color: "var(--color-text-dim)", fontSize: 11 }}>
          +{ids.length - 8} more
        </span>
      )}
      <span className="selection-popover__close" onClick={onClear} title="Clear selection">
        ×
      </span>
    </div>
  );
}

// ─── Placeholder for views not yet implemented ───

function PlaceholderView({ label, description }: { label: string; description: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", color: "var(--color-text-dim)", gap: 8, padding: 32,
    }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>{description}</div>
      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>Coming next</div>
    </div>
  );
}
