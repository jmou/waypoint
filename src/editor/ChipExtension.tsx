/**
 * TipTap extension: EntityChip
 *
 * An inline node that represents a mention of a Place or Experience within
 * the notes editor. Rendered as an interactive chip with type-specific
 * icons and indicators (pin, clock, amount).
 *
 * Schema:
 *   <entity-chip entityId="uuid" />
 *
 * The chip reads live entity data from the store (name, type, schedule, amount)
 * so it always reflects current state. Only the entityId is persisted in the
 * document.
 *
 * Interactions:
 * - Click chip name → select entity (handleClick with modifier support)
 * - Click pin icon → select + navigate to map
 * - Click clock icon → select + navigate to schedule
 * - Click amount → select + navigate to expenses
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted } from "../entities/helpers";
import { isExperience, CURRENCY_SYMBOLS } from "../entities/types";
import { Chip } from "../components/Chip";
import { useNavigate } from "../context/NavigationContext";

// ─── TipTap Node definition ───

export interface EntityChipOptions {
  onNavigate?: (view: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    entityChip: {
      insertEntityChip: (entityId: string) => ReturnType;
    };
  }
}

export const EntityChipExtension = Node.create<EntityChipOptions>({
  name: "entityChip",
  group: "inline",
  inline: true,
  atom: true, // non-editable, treated as single unit

  addOptions() {
    return {
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-id"),
        renderHTML: (attributes) => ({
          "data-entity-id": attributes.entityId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "entity-chip" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityChipView);
  },

  addCommands() {
    return {
      insertEntityChip:
        (entityId: string) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { entityId },
            })
            .insertContent(" ") // space after chip
            .run();
        },
    };
  },
});

// ─── React component rendered inside the editor ───

function EntityChipView({ node }: { node: { attrs: Record<string, any> } }) {
  const entityId = node.attrs.entityId;
  const entity = useEntityStore((s) => s.entities.get(entityId));
  const entities = useEntityStore((s) => s.entities);
  const isSelected = useSelectionStore((s) => s.selected.has(entityId));
  const selected = useSelectionStore((s) => s.selected);
  const handleClick = useSelectionStore((s) => s.handleClick);
  const navigate = useNavigate();

  if (!entity) {
    return (
      <NodeViewWrapper as="span" className="entity-chip entity-chip--missing">
        [deleted]
      </NodeViewWrapper>
    );
  }

  const highlighted = computeHighlighted(entities, selected);
  const isHighlighted = highlighted.has(entityId);

  const isExp = isExperience(entity);
  const hasSchedule = isExp && entity.schedule !== null;
  const hasAmount = isExp && entity.amount !== null;
  const hasPlace = isExp && entity.placeIds.length > 0;

  // Resolve place name for experience chips
  let placeName: string | null = null;
  if (hasPlace && isExp) {
    const place = entities.get(entity.placeIds[0]);
    if (place) placeName = place.name;
  }

  // Currency symbol
  const currencySymbol = isExp ? CURRENCY_SYMBOLS[entity.currency] || "¥" : "¥";

  return (
    <NodeViewWrapper as="span" style={{ display: "inline" }}>
      <Chip
        type={entity.type}
        selected={isSelected}
        highlighted={isHighlighted}
        onClick={(e) => handleClick(entityId, e)}
        onPlaceIconClick={(e) => {
          handleClick(entityId, e);
          navigate("map");
        }}
        onClockClick={(e) => {
          handleClick(entityId, e);
          navigate("schedule");
        }}
        onExpenseClick={(e) => {
          handleClick(entityId, e);
          navigate("expenses");
        }}
        scheduled={hasSchedule}
        amount={hasAmount && isExp ? entity.amount : null}
        currencySymbol={currencySymbol}
        placeName={placeName}
      >
        {entity.name}
      </Chip>
    </NodeViewWrapper>
  );
}
