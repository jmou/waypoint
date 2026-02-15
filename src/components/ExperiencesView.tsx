/**
 * ExperiencesView — tree hierarchy of experiences (right pane).
 *
 * Renders a recursive, expandable/collapsible tree of experiences using
 * getRoots + getChildren from helpers.ts. Each row shows an indicator
 * (¥ for expenses, dot for others), the experience name, associated
 * place, schedule date, and aggregated subtree cost.
 *
 * Supports:
 * - Expand/collapse via ▶ toggle (default open for depth < 2)
 * - Selection + highlighting with consistent visual treatment
 * - Drag-and-drop reparenting (calls store.reparent)
 * - Inline add row at each hierarchy level (calls store.addExperience)
 */

import React, { useState, useCallback } from "react";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import {
  computeHighlighted,
  getRoots,
  getChildren,
  getSubtreeCost,
  EntityMap,
} from "../entities/helpers";
import {
  Experience,
  CURRENCY_SYMBOLS,
  isExperience,
} from "../entities/types";
import { PinIcon, ClockIcon } from "./Chip";

// ─── Colors (match design tokens) ───

const C = {
  blue: "#2d5f82",
  blueText: "#1e4a6a",
  accent: "#a33d22",
  text: "#1a1917",
  textMuted: "#555249",
  textDim: "#8a8680",
  surfaceAlt: "#f0efec",
  border: "rgba(0,0,0,0.09)",
  highlightBg: "rgba(45,95,130,0.08)",
  highlightBorder: "rgba(45,95,130,0.28)",
};

// ─── Helpers ───

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtCost(byCurrency: Map<string, number>): string {
  if (byCurrency.size === 0) return "";
  return Array.from(byCurrency.entries())
    .map(([currency, amount]) => {
      const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
      return `${sym}${amount.toLocaleString()}`;
    })
    .join(" + ");
}

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

// ─── Experience tree node ───

function ExperienceNode({ experience, depth, entities, selected, highlighted, onDrop }: {
  experience: Experience;
  depth: number;
  entities: EntityMap;
  selected: Set<string>;
  highlighted: Set<string>;
  onDrop: (draggedId: string, targetId: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [dragOver, setDragOver] = useState(false);
  const handleClick = useSelectionStore((s) => s.handleClick);
  const addExperience = useEntityStore((s) => s.addExperience);

  const children = getChildren(entities, experience.id).filter(isExperience);
  const hasKids = children.length > 0;
  const isSel = selected.has(experience.id);
  const isHL = highlighted.has(experience.id);

  // Resolve associated places
  const placeNames = experience.placeIds
    .map((pid) => entities.get(pid))
    .filter(Boolean)
    .map((p) => p!.name);

  // Subtree cost
  const costBreakdown = getSubtreeCost(entities, experience.id);
  const costStr = fmtCost(costBreakdown.byCurrency);

  // Schedule
  const schedDate = experience.schedule?.date;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", experience.id);
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
          if (draggedId && draggedId !== experience.id) {
            onDrop(draggedId, experience.id);
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
            onClick={(e) => handleClick(experience.id, e)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              margin: "1px 8px",
              marginLeft: hasKids ? 8 : 26,
              borderRadius: 6,
              cursor: "pointer",
              flex: 1,
              background: dragOver
                ? C.highlightBg
                : isSel
                  ? C.blue
                  : isHL
                    ? C.highlightBg
                    : "transparent",
              border: isSel
                ? `1.5px solid ${C.blue}`
                : isHL
                  ? `1px solid ${C.highlightBorder}`
                  : "1px solid transparent",
              transition: "all 0.12s",
              fontSize: 12,
            }}
          >
            {/* Indicator: ¥ for expenses, dot for non-expenses */}
            <span style={{
              width: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {experience.amount != null ? (
                <span style={{
                  fontSize: 9,
                  color: isSel ? "rgba(255,255,255,0.8)" : C.blueText,
                  fontWeight: 700,
                }}>
                  {CURRENCY_SYMBOLS[experience.currency] || "$"}
                </span>
              ) : (
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: isSel ? "rgba(255,255,255,0.6)" : C.blue,
                  opacity: isSel ? 1 : 0.5,
                }} />
              )}
            </span>

            {/* Name */}
            <span style={{
              fontWeight: hasKids ? 600 : 400,
              flex: 1,
              color: isSel ? "#fff" : C.text,
            }}>
              {experience.name}
            </span>

            {/* Metadata: place, schedule, cost */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
              {placeNames.length > 0 && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  fontSize: 9,
                  color: isSel ? "rgba(255,255,255,0.7)" : C.accent,
                }}>
                  <PinIcon size={9} color={isSel ? "rgba(255,255,255,0.7)" : C.accent} />
                  {placeNames[0]}
                </span>
              )}
              {schedDate && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  fontSize: 9,
                  color: isSel ? "rgba(255,255,255,0.6)" : C.textMuted,
                }}>
                  <ClockIcon size={8} color={isSel ? "rgba(255,255,255,0.6)" : C.textMuted} />
                  {fmtDate(schedDate)}
                </span>
              )}
              {costStr && (
                <span style={{
                  fontSize: 9,
                  color: isSel ? "rgba(255,255,255,0.7)" : C.blueText,
                  opacity: isSel ? 1 : 0.6,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {costStr}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {open && children.map((child) => (
        <ExperienceNode
          key={child.id}
          experience={child}
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
            placeholder="Add experience..."
            depth={0}
            onAdd={(name) => addExperience(name, experience.id)}
          />
        </div>
      )}
    </>
  );
}

// ─── ExperiencesView ───

export function ExperiencesView() {
  const entities = useEntityStore((s) => s.entities);
  const selected = useSelectionStore((s) => s.selected);
  const reparent = useEntityStore((s) => s.reparent);
  const addExperience = useEntityStore((s) => s.addExperience);

  const highlighted = computeHighlighted(entities, selected);
  const roots = getRoots(entities, "experience").filter(isExperience);

  const handleDrop = useCallback((draggedId: string, targetId: string) => {
    reparent(draggedId, targetId);
  }, [reparent]);

  return (
    <div style={{ overflow: "auto", height: "100%", paddingTop: 4, paddingBottom: 16 }}>
      {roots.map((exp) => (
        <ExperienceNode
          key={exp.id}
          experience={exp}
          depth={0}
          entities={entities}
          selected={selected}
          highlighted={highlighted}
          onDrop={handleDrop}
        />
      ))}
      <InlineAddRow
        placeholder="Add experience..."
        depth={0}
        onAdd={(name) => addExperience(name, null)}
      />
    </div>
  );
}
