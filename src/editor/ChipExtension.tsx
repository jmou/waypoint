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
import { isExperience, isPlace } from "../entities/types";

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

interface EntityChipViewProps {
  node: { attrs: { entityId: string } };
  selected: boolean;
}

function EntityChipView({ node }: EntityChipViewProps) {
  const entityId = node.attrs.entityId;
  const entity = useEntityStore((s) => s.entities.get(entityId));
  const isSelected = useSelectionStore((s) => s.selected.has(entityId));
  const handleClick = useSelectionStore((s) => s.handleClick);

  if (!entity) {
    return (
      <NodeViewWrapper as="span" className="entity-chip entity-chip--missing">
        [deleted]
      </NodeViewWrapper>
    );
  }

  const type = entity.type;
  const color = type === "place" ? "var(--color-accent)" : "var(--color-blue)";
  const isExp = isExperience(entity);
  const hasSchedule = isExp && entity.schedule !== null;
  const hasAmount = isExp && entity.amount !== null;
  const hasPlace = isExp && entity.placeIds.length > 0;

  return (
    <NodeViewWrapper
      as="span"
      className={`entity-chip entity-chip--${type} ${isSelected ? "entity-chip--selected" : ""}`}
      data-entity-type={type}
    >
      {/* Place icon (for place chips, or place indicator on experience chips) */}
      {type === "place" && (
        <span
          className="entity-chip__icon entity-chip__icon--place"
          onClick={(e) => {
            e.stopPropagation();
            handleClick(entityId, e);
            // onNavigate("map") would be called here via context
          }}
          title="Open in map"
        >
          <PinSvg />
        </span>
      )}

      {/* Name */}
      <span
        className="entity-chip__name"
        onClick={(e) => {
          e.stopPropagation();
          handleClick(entityId, e);
        }}
      >
        {entity.name}
      </span>

      {/* Experience place indicator */}
      {hasPlace && (
        <>
          <span className="entity-chip__divider" />
          <span
            className="entity-chip__icon entity-chip__icon--exp-place"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(entityId, e);
            }}
            title="Associated place"
          >
            <PinSvg />
          </span>
        </>
      )}

      {/* Schedule indicator */}
      {hasSchedule && (
        <>
          <span className="entity-chip__divider" />
          <span
            className="entity-chip__icon entity-chip__icon--clock"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(entityId, e);
            }}
            title="Scheduled"
          >
            <ClockSvg />
          </span>
        </>
      )}

      {/* Amount indicator */}
      {hasAmount && isExperience(entity) && (
        <>
          <span className="entity-chip__divider" />
          <span
            className="entity-chip__icon entity-chip__icon--amount"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(entityId, e);
            }}
            title="Expense"
          >
            ¥{entity.amount!.toLocaleString()}
          </span>
        </>
      )}
    </NodeViewWrapper>
  );
}

// ─── Inline SVG icons ───

function PinSvg() {
  return (
    <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" />
      <circle cx="8" cy="6" r="1.5" />
    </svg>
  );
}

function ClockSvg() {
  return (
    <svg width={9} height={9} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}
