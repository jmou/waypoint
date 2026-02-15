/**
 * NotesEditor — main TipTap editor.
 *
 * Wires up EntityChip + SlashCommand extensions with the entity store.
 * Accepts initial content (from seed or Liveblocks) as TipTap JSON.
 */

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EntityChipExtension } from "./ChipExtension";
import { SlashCommandExtension } from "./SlashCommand";
import { useEntityStore } from "../entities/store";
import { EntityId } from "../entities/types";

interface NotesEditorProps {
  initialContent?: Record<string, any>;
  onNavigate?: (view: string) => void;
}

export function NotesEditor({ initialContent, onNavigate }: NotesEditorProps) {
  const entities = useEntityStore((s) => s.entities);
  const addPlace = useEntityStore((s) => s.addPlace);
  const addExperience = useEntityStore((s) => s.addExperience);
  const editorRef = useRef<Editor | null>(null);

  const getEntities = useCallback(() => entities, [entities]);

  const getMentionedIds = useCallback((): Set<EntityId> => {
    const ids = new Set<EntityId>();
    const editor = editorRef.current;
    if (!editor) return ids;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "entityChip" && node.attrs.entityId) {
        ids.add(node.attrs.entityId as EntityId);
      }
    });
    return ids;
  }, []);

  const handleCreate = useCallback(
    (type: "place" | "experience", name: string): EntityId => {
      const roots = Array.from(entities.values()).filter(
        (e) => e.type === type && e.parentId === null
      );
      const parentId = roots[0]?.id || null;
      return type === "place" ? addPlace(name, parentId) : addExperience(name, parentId);
    },
    [entities, addPlace, addExperience]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
      }),
      EntityChipExtension.configure({ onNavigate }),
      SlashCommandExtension.configure({
        getEntities,
        getMentionedIds,
        onCreate: handleCreate,
      }),
    ],
    content: initialContent || "<p>Start planning... type <code>/</code> to mention entities.</p>",
    editorProps: {
      attributes: {
        class: "waypoint-notes-editor",
        spellcheck: "false",
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  return (
    <div className="notes-editor-container">
      <EditorContent editor={editor} />
    </div>
  );
}

/** Extract all entity IDs mentioned as chips in the document. */
export function extractMentionedIds(editor: Editor | null): Set<EntityId> {
  const ids = new Set<EntityId>();
  if (!editor) return ids;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "entityChip" && node.attrs.entityId) {
      ids.add(node.attrs.entityId);
    }
  });
  return ids;
}
