import { Fragment, useState, type ReactNode } from "react";
import type { Entity, EntityId, EntityMap } from "../../entities";
import { getChildren, isExperience } from "../../entities";
import { DropZone } from "./DropZone";
import { InlineAddRow } from "./InlineAddRow";
import type { TreeColors, NodeRenderState } from "./types";

interface TreeNodeProps<T extends Entity> {
  entity: T;
  entities: EntityMap;
  selected: Set<EntityId>;
  highlighted: Set<EntityId>;
  colors: TreeColors;
  onDrop: (draggedId: EntityId, targetId: EntityId) => void;
  onMoveTo: (draggedId: EntityId, parentId: EntityId | null, index: number) => void;
  onClick: (id: EntityId, event?: { ctrlKey?: boolean; metaKey?: boolean }) => void;
  renderContent: (entity: T, state: NodeRenderState) => ReactNode;
  addEntity: (name: string, parentId: EntityId) => void;
  typeGuard: (entity: Entity) => entity is T;
}

/**
 * Generic tree node with expand/collapse, drag-and-drop, and recursive rendering.
 * Always defaults to open state (simplified - no conditional logic).
 * Applies chip-style colors for selected/highlighted states.
 */
export function TreeNode<T extends Entity>({
  entity,
  entities,
  selected,
  highlighted,
  colors,
  onDrop,
  onMoveTo,
  onClick,
  renderContent,
  addEntity,
  typeGuard,
}: TreeNodeProps<T>) {
  const [open, setOpen] = useState(true); // Always default to open
  const [dragOver, setDragOver] = useState(false);

  const isSelected = selected.has(entity.id);
  const isHighlighted = highlighted.has(entity.id);

  const children = getChildren(entities, entity.id).filter(typeGuard);
  const hasChildren = children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", entity.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDropOnNode = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain") as EntityId;
    if (draggedId && draggedId !== entity.id) {
      onDrop(draggedId, entity.id);
    }
    setDragOver(false);
  };

  const handleAddChild = (name: string) => {
    addEntity(name, entity.id);
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    onClick(entity.id, { ctrlKey: e.ctrlKey, metaKey: e.metaKey });
  };

  // Compute styles using chip colors
  const accentColor = colors.accent;
  const backgroundColor = isSelected
    ? accentColor
    : isHighlighted
    ? `${accentColor}12`
    : dragOver
    ? `${accentColor}18`
    : `${accentColor}05`;

  const border = isSelected
    ? `1.5px solid ${accentColor}`
    : isHighlighted
    ? `1.5px solid ${accentColor}50`
    : dragOver
    ? `1px solid ${accentColor}60`
    : `1px solid ${accentColor}10`;

  const textColor = isSelected ? "#fff" : colors.text;

  const state: NodeRenderState = {
    isSelected,
    isHighlighted,
    hasChildren,
    dragOver,
  };

  return (
    <>
      {/* Outer container for drop-on-node (reparent) */}
      <div
        data-tree-node
        data-entity-id={entity.id}
        data-entity-type={entity.type}
        data-parent-id={entity.parentId || undefined}
        data-has-children={hasChildren ? "true" : "false"}
        data-expanded={open ? "true" : "false"}
        data-selected={isSelected ? "true" : undefined}
        data-highlighted={isHighlighted ? "true" : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnNode}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: hasChildren ? -20 : 0,
        }}
      >
        {/* Expand toggle */}
        {hasChildren && (
          <button
            data-toggle
            onClick={handleToggle}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 10,
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 14,
              flexShrink: 0,
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            ▶
          </button>
        )}

        {/* Draggable chip */}
        <div
          data-tree-row
          data-entity-type={entity.type}
          data-is-expense={
            isExperience(entity) && entity.amount != null ? "true" : "false"
          }
          data-has-place={
            isExperience(entity) && entity.placeIds?.length > 0 ? "true" : "false"
          }
          data-has-schedule={
            isExperience(entity) && entity.schedule ? "true" : "false"
          }
          draggable
          onDragStart={handleDragStart}
          onClick={handleNodeClick}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 5,
            paddingBottom: 5,
            backgroundColor,
            border,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            color: textColor,
            cursor: "pointer",
            transition: "all 0.12s ease",
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          {renderContent(entity, state)}
        </div>
      </div>

      {/* Recursive children */}
      {open && hasChildren && (
        <div style={{paddingLeft: 20}}>
          <DropZone
            parentId={entity.id}
            index={0}
            onMoveTo={onMoveTo}
          />
          {children.map((child, idx) => (
            <Fragment key={child.id}>
              <TreeNode
                entity={child}
                entities={entities}
                selected={selected}
                highlighted={highlighted}
                colors={colors}
                onDrop={onDrop}
                onMoveTo={onMoveTo}
                onClick={onClick}
                renderContent={renderContent}
                addEntity={addEntity}
                typeGuard={typeGuard}
              />
              <DropZone
                parentId={entity.id}
                index={idx + 1}
                onMoveTo={onMoveTo}
              />
            </Fragment>
          ))}
          <InlineAddRow
            placeholder="Add..."
            onAdd={handleAddChild}
          />
        </div>
      )}
    </>
  );
}
