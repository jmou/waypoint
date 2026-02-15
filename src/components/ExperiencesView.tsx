/**
 * ExperiencesView — tree hierarchy of experiences (right pane).
 *
 * Simplified to use shared EntityTreeView component.
 * Defines experience-specific colors and rendering logic only.
 * Shows: name, associated place (first one), and schedule date.
 */

import { EntityTreeView, type TreeColors, type NodeRenderState } from "./tree";
import type { Experience, EntityMap } from "../entities";
import { PinIcon, ClockIcon } from "./Chip";

// ─── Experience color theme ───

const EXPERIENCE_COLORS: TreeColors = {
  accent: "#2d5f82",
  text: "#1a1917",
  textMuted: "#555249",
  textDim: "#8a8680",
  surfaceAlt: "#f0efec",
  border: "rgba(0,0,0,0.09)",
  highlightBg: "rgba(45,95,130,0.08)",
  highlightBorder: "rgba(45,95,130,0.28)",
};

// ─── Date formatting ───

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Experience-specific node renderer ───

function renderExperienceNode(
  exp: Experience,
  state: NodeRenderState,
  entities: EntityMap
) {
  // Resolve associated place (first one)
  const placeName = exp.placeIds[0] ? entities.get(exp.placeIds[0])?.name : null;
  const schedDate = exp.schedule?.date;

  return (
    <>
      {/* Name */}
      <span
        style={{
          fontWeight: state.hasChildren ? 600 : 400,
          flex: 1,
          color: state.isSelected ? "#fff" : EXPERIENCE_COLORS.accent,
        }}
      >
        {exp.name}
      </span>

      {/* Metadata: place + schedule */}
      <div
        style={{
          display: "flex",
          gap: 5,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {placeName && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              fontSize: 9,
              color: state.isSelected ? "rgba(255,255,255,0.7)" : "#a33d22", // Place accent color
            }}
          >
            <PinIcon
              size={9}
              color={state.isSelected ? "rgba(255,255,255,0.7)" : "#a33d22"}
            />
            {placeName}
          </span>
        )}
        {schedDate && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              fontSize: 9,
              color: state.isSelected ? "rgba(255,255,255,0.6)" : EXPERIENCE_COLORS.textMuted,
            }}
          >
            <ClockIcon
              size={8}
              color={state.isSelected ? "rgba(255,255,255,0.6)" : EXPERIENCE_COLORS.textMuted}
            />
            {fmtDate(schedDate)}
          </span>
        )}
      </div>
    </>
  );
}

// ─── ExperiencesView ───

export function ExperiencesView() {
  return (
    <EntityTreeView<Experience>
      entityType="experience"
      colors={EXPERIENCE_COLORS}
      placeholder="Add experience..."
      renderNode={(exp, state, entities) =>
        renderExperienceNode(exp, state, entities)
      }
    />
  );
}
