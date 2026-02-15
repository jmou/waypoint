/**
 * NotesEditor — main TipTap editor.
 *
 * Wires up EntityChip + SlashCommand extensions with the entity store.
 * Accepts initial content (from seed or Liveblocks) as TipTap JSON.
 *
 * Includes paragraph-level highlighting: paragraphs containing selected
 * or highlighted entity chips get a tinted background + left border.
 */

import React, { useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";
import { EntityChipExtension } from "./ChipExtension";
import { SlashCommandExtension } from "./SlashCommand";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted } from "../entities/helpers";
import { EntityId } from "../entities/types";

interface NotesEditorProps {
  initialContent?: Record<string, any>;
  onNavigate?: (view: string) => void;
}

// ─── Paragraph Highlight Extension ───
// Decorates paragraphs that contain selected/highlighted entity chips
// with CSS classes for visual feedback.

const paragraphHighlightKey = new PluginKey("paragraphHighlight");

function createParagraphHighlightExtension() {
  return Extension.create({
    name: "paragraphHighlight",

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: paragraphHighlightKey,
          state: {
            init() {
              return { selected: new Set<string>(), highlighted: new Set<string>() };
            },
            apply(tr, value) {
              const meta = tr.getMeta(paragraphHighlightKey);
              if (meta) return meta;
              return value;
            },
          },
          props: {
            decorations(state) {
              const pluginState = paragraphHighlightKey.getState(state);
              if (!pluginState) return DecorationSet.empty;

              const { selected, highlighted } = pluginState;
              if (selected.size === 0 && highlighted.size === 0) return DecorationSet.empty;

              const decorations: Decoration[] = [];

              state.doc.descendants((node, pos) => {
                if (node.type.name !== "paragraph") return;

                // Check if this paragraph contains any entity chips
                let hasSel = false;
                let hasHL = false;

                node.descendants((child) => {
                  if (child.type.name === "entityChip") {
                    const entityId = child.attrs.entityId;
                    if (selected.has(entityId)) hasSel = true;
                    if (highlighted.has(entityId)) hasHL = true;
                  }
                });

                if (hasSel) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: "notes-block notes-block--has-selected",
                    })
                  );
                } else if (hasHL) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: "notes-block notes-block--has-highlighted",
                    })
                  );
                }
              });

              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
}

export function NotesEditor({ initialContent, onNavigate }: NotesEditorProps) {
  const entities = useEntityStore((s) => s.entities);
  const addPlace = useEntityStore((s) => s.addPlace);
  const addExperience = useEntityStore((s) => s.addExperience);
  const selected = useSelectionStore((s) => s.selected);
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
      createParagraphHighlightExtension(),
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

  // Sync selection + highlighting state into the ProseMirror plugin
  useEffect(() => {
    if (!editor) return;
    const highlighted = computeHighlighted(entities, selected);
    const tr = editor.state.tr.setMeta(paragraphHighlightKey, {
      selected,
      highlighted,
    });
    editor.view.dispatch(tr);
  }, [editor, selected, entities]);

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
