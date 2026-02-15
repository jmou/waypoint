/**
 * PlacesView — tree hierarchy of places (right pane).
 *
 * Simplified to use shared EntityTreeView component.
 * Defines place-specific colors and rendering logic only.
 */

import { EntityTreeView, type TreeColors, type NodeRenderState } from "./tree";
import type { Place, EntityMap } from "../entities";
import { PinIcon } from "./Chip";

// ─── Place color theme ───

const PLACE_COLORS: TreeColors = {
  accent: "#a33d22",
  text: "#1a1917",
  textMuted: "#555249",
  textDim: "#8a8680",
  surfaceAlt: "#f0efec",
  border: "rgba(0,0,0,0.09)",
  highlightBg: "rgba(163,61,34,0.06)",
  highlightBorder: "rgba(163,61,34,0.22)",
};

// ─── Place-specific node renderer ───

function renderPlaceNode(place: Place, state: NodeRenderState) {
  const unlocated = !place.coords && !state.hasChildren;

  return (
    <>
      <span
        data-row-indicator
        style={{
          display: "inline-flex",
          alignItems: "center",
          opacity: state.isSelected ? 0.9 : unlocated ? 0.35 : 0.6,
        }}
      >
        <span data-icon="pin">
          <PinIcon size={11} color={state.isSelected ? "#fff" : PLACE_COLORS.accent} />
        </span>
      </span>
      <span
        data-row-name
        style={{
          color: state.isSelected ? "#fff" : unlocated ? PLACE_COLORS.textDim : PLACE_COLORS.accent,
          fontWeight: state.hasChildren ? 600 : 400,
          flex: 1,
        }}
      >
        {place.name}
      </span>
      {unlocated && !state.isSelected && (
        <span
          data-no-location
          style={{
            fontSize: 9,
            color: PLACE_COLORS.textDim,
            fontStyle: "italic",
          }}
        >
          no loc
        </span>
      )}
    </>
  );
}

// ─── PlacesView ───

export function PlacesView() {
  return (
    <EntityTreeView<Place>
      entityType="place"
      colors={PLACE_COLORS}
      placeholder="Add place..."
      renderNode={renderPlaceNode}
    />
  );
}
