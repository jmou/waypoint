/**
 * PlacesView — tree hierarchy of places (right pane).
 *
 * Renders a recursive, expandable/collapsible tree of places using
 * getRoots + getChildren from helpers.ts. Each row shows a pin icon,
 * the place name, and an "no loc" label for unlocated leaf places.
 *
 * Supports:
 * - Expand/collapse via ▶ toggle
 * - Selection + highlighting with consistent visual treatment
 * - Drag-and-drop reparenting (calls store.reparent)
 * - Inline add row at each hierarchy level (calls store.addPlace)
 */

import React, { useState, useCallback } from "react";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted, getRoots, getChildren } from "../entities/helpers";
import { Place, EntityId, isPlace } from "../entities/types";
import { PinIcon } from "./Chip";

// ─── Colors (match design tokens) ───

const C = {
  accent: "#a33d22",
  text: "#1a1917",
  textMuted: "#555249",
  textDim: "#8a8680",
  surfaceAlt: "#f0efec",
  border: "rgba(0,0,0,0.09)",
  highlightPlaceBg: "rgba(163,61,34,0.06)",
  highlightPlaceBorder: "rgba(163,61,34,0.22)",
};

// ─── Inline add row ───

function InlineAddRow({ placeholder, onAdd, depth }: {
  placeholder: string;
  onAdd: (name: string) => void;
  depth: number;
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");

  const commit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setActive(false);
    setValue("");
  }, [value, onAdd]);

  if (!active) {
    return (
      <div
        onClick={() => setActive(true)}
        style={{
          padding: `4px 10px 4px ${16 + depth * 18}px`,
          fontSize: 12,
          color: C.textDim,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          opacity: 0.45,
          margin: "0 8px",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.45"; }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
        <span>{placeholder}</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: `3px 10px 3px ${16 + depth * 18}px`,
      display: "flex",
      alignItems: "center",
      gap: 6,
      margin: "0 8px",
    }}>
      <span style={{ fontSize: 13, color: C.textDim }}>+</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setActive(false); setValue(""); }
        }}
        placeholder={placeholder}
        style={{
          background: C.surfaceAlt,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 12,
          color: C.text,
          outline: "none",
          flex: 1,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ─── Place tree node ───

function PlaceNode({ place, depth, entities, selected, highlighted, onDrop }: {
  place: Place;
  depth: number;
  entities: Map<string, any>;
  selected: Set<string>;
  highlighted: Set<string>;
  onDrop: (draggedId: string, targetId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const handleClick = useSelectionStore((s) => s.handleClick);
  const addPlace = useEntityStore((s) => s.addPlace);

  const children = getChildren(entities, place.id).filter(isPlace);
  const hasKids = children.length > 0;
  const isSel = selected.has(place.id);
  const isHL = highlighted.has(place.id);
  const unlocated = !place.coords && !hasKids;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", place.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const draggedId = e.dataTransfer.getData("text/plain");
          if (draggedId && draggedId !== place.id) {
            onDrop(draggedId, place.id);
          }
        }}
        style={{ paddingLeft: depth * 18 }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {hasKids && (
            <span
              onClick={() => setOpen(!open)}
              style={{
                width: 18,
                fontSize: 8,
                color: C.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.12s",
                marginLeft: 8,
              }}
            >
              ▶
            </span>
          )}
          <div
            onClick={(e) => handleClick(place.id, e)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              margin: "1px 8px",
              marginLeft: hasKids ? 8 : 26,
              borderRadius: 6,
              cursor: "pointer",
              flex: 1,
              background: dragOver
                ? C.highlightPlaceBg
                : isSel
                  ? C.accent
                  : isHL
                    ? C.highlightPlaceBg
                    : "transparent",
              border: isSel
                ? `1.5px solid ${C.accent}`
                : isHL
                  ? `1px solid ${C.highlightPlaceBorder}`
                  : "1px solid transparent",
              transition: "all 0.12s",
              fontSize: 12,
            }}
          >
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              opacity: isSel ? 0.9 : unlocated ? 0.35 : 0.6,
            }}>
              <PinIcon size={11} color={isSel ? "#fff" : C.accent} />
            </span>
            <span style={{
              color: isSel ? "#fff" : unlocated ? C.textDim : C.text,
              fontWeight: hasKids ? 600 : 400,
              flex: 1,
            }}>
              {place.name}
            </span>
            {unlocated && !isSel && (
              <span style={{ fontSize: 9, color: C.textDim, fontStyle: "italic" }}>
                no loc
              </span>
            )}
          </div>
        </div>
      </div>
      {open && children.map((child) => (
        <PlaceNode
          key={child.id}
          place={child}
          depth={depth + 1}
          entities={entities}
          selected={selected}
          highlighted={highlighted}
          onDrop={onDrop}
        />
      ))}
      {open && hasKids && (
        <div style={{ paddingLeft: (depth + 1) * 18 }}>
          <InlineAddRow
            placeholder="Add place..."
            depth={0}
            onAdd={(name) => addPlace(name, place.id)}
          />
        </div>
      )}
    </>
  );
}

// ─── PlacesView ───

export function PlacesView() {
  const entities = useEntityStore((s) => s.entities);
  const selected = useSelectionStore((s) => s.selected);
  const reparent = useEntityStore((s) => s.reparent);
  const addPlace = useEntityStore((s) => s.addPlace);

  const highlighted = computeHighlighted(entities, selected);
  const roots = getRoots(entities, "place").filter(isPlace);

  const handleDrop = useCallback((draggedId: string, targetId: string) => {
    reparent(draggedId, targetId);
  }, [reparent]);

  return (
    <div style={{ overflow: "auto", height: "100%", paddingTop: 4, paddingBottom: 16 }}>
      {roots.map((place) => (
        <PlaceNode
          key={place.id}
          place={place}
          depth={0}
          entities={entities}
          selected={selected}
          highlighted={highlighted}
          onDrop={handleDrop}
        />
      ))}
      <InlineAddRow
        placeholder="Add place..."
        depth={0}
        onAdd={(name) => addPlace(name, null)}
      />
    </div>
  );
}
