import { Fragment, type ReactNode } from "react";
import type { Entity, EntityId, EntityMap } from "../../entities";
import { useEntityStore, useSelectionStore, computeHighlighted, getRoots, isPlace, isExperience } from "../../entities";
import { TreeNode } from "./TreeNode";
import { DropZone } from "./DropZone";
import { InlineAddRow } from "./InlineAddRow";
import type { TreeColors, NodeRenderState } from "./types";

interface EntityTreeViewProps<T extends Entity> {
  entityType: "place" | "experience";
  colors: TreeColors;
  placeholder: string;
  renderNode: (entity: T, state: NodeRenderState, entities: EntityMap) => ReactNode;
}

/**
 * Generic tree view container for entity hierarchies.
 * Handles store integration, filtering, and root-level layout.
 */
export function EntityTreeView<T extends Entity>({
  entityType,
  colors,
  placeholder,
  renderNode,
}: EntityTreeViewProps<T>) {
  // Store hooks
  const entities = useEntityStore((s) => s.entities);
  const reparent = useEntityStore((s) => s.reparent);
  const moveTo = useEntityStore((s) => s.moveTo);
  const addPlace = useEntityStore((s) => s.addPlace);
  const addExperience = useEntityStore((s) => s.addExperience);

  const selected = useSelectionStore((s) => s.selected);
  const handleClick = useSelectionStore((s) => s.handleClick);

  // Computations
  const highlighted = computeHighlighted(entities, selected);
  const roots = getRoots(entities, entityType).filter(
    entityType === "place" ? isPlace : isExperience
  ) as T[];

  // Select correct store methods based on entity type
  const addEntity = entityType === "place" ? addPlace : addExperience;
  const typeGuard = entityType === "place"
    ? ((e: Entity): e is T => isPlace(e) as boolean)
    : ((e: Entity): e is T => isExperience(e) as boolean);

  // Callbacks
  const handleDrop = (draggedId: EntityId, targetId: EntityId) => {
    reparent(draggedId, targetId);
  };

  const handleMoveTo = (draggedId: EntityId, parentId: EntityId | null, index: number) => {
    // Apply off-by-one fix: don't move if dropping right below self
    const draggedEntity = entities.get(draggedId);
    if (!draggedEntity) return;

    const siblings = parentId
      ? Array.from(entities.values()).filter(
          (e) => e.parentId === parentId && e.type === entityType
        )
      : roots;

    const draggedIdx = siblings.findIndex((e) => e.id === draggedId);
    if (draggedIdx !== -1 && draggedIdx === index - 1) {
      return; // Dropping right below self = no-op
    }

    moveTo(draggedId, parentId, index);
  };

  const handleAddRoot = (name: string) => {
    addEntity(name, null);
  };

  return (
    <div
      style={{
        padding: 8,
        paddingLeft: 28,
      }}
    >
      <DropZone parentId={null} index={0} onMoveTo={handleMoveTo} />

      {roots.map((root, idx) => (
        <Fragment key={root.id}>
          <TreeNode
            entity={root}
            entities={entities}
            selected={selected}
            highlighted={highlighted}
            colors={colors}
            onDrop={handleDrop}
            onMoveTo={handleMoveTo}
            onClick={handleClick}
            renderContent={(entity, state) => renderNode(entity, state, entities)}
            addEntity={addEntity}
            typeGuard={typeGuard}
          />
          <DropZone
            parentId={null}
            index={idx + 1}
            onMoveTo={handleMoveTo}
          />
        </Fragment>
      ))}

      <InlineAddRow placeholder={placeholder} onAdd={handleAddRoot} />
    </div>
  );
}
