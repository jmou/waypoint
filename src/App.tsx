/**
 * App — root component.
 *
 * Hydrates the entity store with seed data on mount, then renders
 * the two-pane layout. Currently only the Notes editor is live;
 * other views (Map, Schedule, Expenses, Places, Experiences) are
 * stubs ready to be built out.
 */

import React, { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useEntityStore } from "./entities/store";
import { useSelectionStore } from "./entities/selection";
import { computeHighlighted } from "./entities/helpers";
import { isExperience, CURRENCY_SYMBOLS, Entity } from "./entities/types";
import { SEED_ENTITIES, SEED_TRIP, SEED_DOCUMENT } from "./entities/seed";
import { NotesEditor } from "./editor/NotesEditor";
import { CollaborativeNotesEditor } from "./editor/CollaborativeNotesEditor";
import { NavigationProvider } from "./context/NavigationContext";
import { Chip } from "./components/Chip";
import { PlacesView } from "./components/PlacesView";
import { ExperiencesView } from "./components/ExperiencesView";
import { ScheduleView } from "./components/ScheduleView";
import { ExpensesView } from "./components/ExpensesView";
import { Party } from "./partykit/Party";
import { PARTYKIT_ENABLED } from "./partykit/config";
import "./styles.css";

// Lazy load MapView to avoid Leaflet initialization issues in test environments
const MapView = lazy(() => import("./components/MapView").then(m => ({ default: m.MapView })));

type LeftTab = "map" | "schedule" | "expenses";
type RightTab = "notes" | "places" | "experiences";

export default function App() {
  const hydrate = useEntityStore((s) => s.hydrate);
  const entities = useEntityStore((s) => s.entities);
  const trip = useEntityStore((s) => s.trip);
  const selected = useSelectionStore((s) => s.selected);
  const clearSelection = useSelectionStore((s) => s.clear);

  const [leftTab, setLeftTab] = useState<LeftTab>("schedule");
  const [rightTab, setRightTab] = useState<RightTab>("notes");
  const [ready, setReady] = useState(false);

  // Hydrate store on mount (only if PartyKit is disabled)
  useEffect(() => {
    if (!PARTYKIT_ENABLED) {
      hydrate(SEED_ENTITIES, SEED_TRIP);
      setReady(true);
    } else {
      // When using PartyKit, sync handles hydration
      setReady(true);
    }
  }, [hydrate]);

  const highlighted = computeHighlighted(entities, selected);

  const handleNavigate = useCallback((view: string) => {
    if (["map", "schedule", "expenses"].includes(view)) setLeftTab(view as LeftTab);
    else if (["notes", "places", "experiences"].includes(view)) setRightTab(view as RightTab);
  }, []);

  if (!ready) return null;

  const content = (
    <NavigationProvider onNavigate={handleNavigate}>
      <AppContent
        leftTab={leftTab}
        rightTab={rightTab}
        setLeftTab={setLeftTab}
        setRightTab={setRightTab}
        handleNavigate={handleNavigate}
      />
    </NavigationProvider>
  );

  // Wrap with Party if enabled
  if (PARTYKIT_ENABLED) {
    return <Party roomId="waypoint-kyoto">{content}</Party>;
  }

  return content;
}

function AppContent({
  leftTab,
  rightTab,
  setLeftTab,
  setRightTab,
  handleNavigate,
}: {
  leftTab: LeftTab;
  rightTab: RightTab;
  setLeftTab: (tab: LeftTab) => void;
  setRightTab: (tab: RightTab) => void;
  handleNavigate: (view: string) => void;
}) {
  const entities = useEntityStore((s) => s.entities);
  const trip = useEntityStore((s) => s.trip);
  const selected = useSelectionStore((s) => s.selected);
  const clearSelection = useSelectionStore((s) => s.clear);

  const highlighted = computeHighlighted(entities, selected);

  if (!trip) return null;

  return (
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
          <div className="pane pane--left" data-pane="left">
            <TabBar
              pane="left"
              tabs={[
                { id: "map", label: "Map" },
                { id: "schedule", label: "Schedule" },
                { id: "expenses", label: "Expenses" },
              ]}
              active={leftTab}
              onSelect={(id) => setLeftTab(id as LeftTab)}
            />
            <div className="pane__content">
              {leftTab === "map" && (
                <Suspense fallback={<MapLoadingFallback />}>
                  <MapView />
                </Suspense>
              )}
              {leftTab === "schedule" && <ScheduleView />}
              {leftTab === "expenses" && <ExpensesView />}
            </div>
          </div>

          {/* Right pane: authoring */}
          <div className="pane pane--right" data-pane="right">
            <TabBar
              pane="right"
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
                PARTYKIT_ENABLED ? (
                  <CollaborativeNotesEditor
                    initialContent={SEED_DOCUMENT}
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <NotesEditor
                    initialContent={SEED_DOCUMENT}
                    onNavigate={handleNavigate}
                  />
                )
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
  );
}

// ─── Tab bar ───

function TabBar({ pane, tabs, active, onSelect }: {
  pane: string;
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
          data-tab={tab.id}
          data-active={active === tab.id ? "true" : undefined}
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
    <div className="selection-popover" data-selection-popover>
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
            entityId={id}
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
        <span data-overflow-count style={{ color: "var(--color-text-dim)", fontSize: 11 }}>
          +{ids.length - 8} more
        </span>
      )}
      <span className="selection-popover__close" data-action="clear" onClick={onClear} title="Clear selection">
        ×
      </span>
    </div>
  );
}

// ─── Map Loading Fallback ───

function MapLoadingFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#eae8e2",
        color: "#8a8680",
        fontSize: 13,
      }}
    >
      Loading map...
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
