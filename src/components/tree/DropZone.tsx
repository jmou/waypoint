import { useState } from "react";
import type { EntityId } from "../../entities";

interface DropZoneProps {
  parentId: EntityId | null;
  index: number;
  onMoveTo: (draggedId: EntityId, parentId: EntityId | null, index: number) => void;
}

/**
 * Visual drop target between tree nodes for drag-and-drop reordering.
 * Uses neutral gray color (not entity-specific).
 */
export function DropZone({ parentId, index, onMoveTo }: DropZoneProps) {
  const [active, setActive] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain") as EntityId;
    if (draggedId) {
      onMoveTo(draggedId, parentId, index);
    }
    setActive(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        height: 4,
        backgroundColor: active ? "rgba(0,0,0,0.16)" : "transparent",
        transition: "all 0.15s ease",
      }}
    />
  );
}
