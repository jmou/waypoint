/**
 * CollaborativeNotesEditor — TipTap editor with Liveblocks collaboration.
 *
 * When Liveblocks is enabled, this wraps the NotesEditor with:
 * - Yjs document sync via Liveblocks provider
 * - Collaborative cursors showing other users' positions
 * - Awareness state for presence
 */

import React, { useCallback, useRef, useEffect, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";
import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf, useUpdateMyPresence, LIVEBLOCKS_ENABLED } from "../liveblocks/config";
import { EntityChipExtension } from "./ChipExtension";
import { SlashCommandExtension } from "./SlashCommand";
import { useEntityStore } from "../entities/store";
import { useSelectionStore } from "../entities/selection";
import { computeHighlighted } from "../entities/helpers";
import { EntityId } from "../entities/types";

interface CollaborativeNotesEditorProps {
  initialContent?: Record<string, any>;
  onNavigate?: (view: string) => void;
}

// ─── Paragraph Highlight Extension ───
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

export function CollaborativeNotesEditor({
  initialContent,
  onNavigate,
}: CollaborativeNotesEditorProps) {
  const entities = useEntityStore((s) => s.entities);
  const addPlace = useEntityStore((s) => s.addPlace);
  const addExperience = useEntityStore((s) => s.addExperience);
  const selected = useSelectionStore((s) => s.selected);
  const editorRef = useRef<Editor | null>(null);

  const room = LIVEBLOCKS_ENABLED ? useRoom() : null;
  const userInfo = LIVEBLOCKS_ENABLED ? useSelf((me: any) => me.info) : null;
  const updateMyPresence = LIVEBLOCKS_ENABLED ? useUpdateMyPresence() : null;

  const [yDoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null);

  // Initialize Liveblocks Yjs provider
  useEffect(() => {
    if (!LIVEBLOCKS_ENABLED || !room) return;

    const yjsProvider = new LiveblocksYjsProvider(room as any, yDoc);
    setProvider(yjsProvider);

    return () => {
      yjsProvider.destroy();
    };
  }, [room, yDoc]);

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

  const extensions = [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      // Disable history when using collaboration
      history: LIVEBLOCKS_ENABLED ? false : undefined,
    }),
    EntityChipExtension.configure({ onNavigate }),
    SlashCommandExtension.configure({
      getEntities,
      getMentionedIds,
      onCreate: handleCreate,
    }),
    createParagraphHighlightExtension(),
  ];

  // Add collaboration extensions if Liveblocks is enabled
  if (LIVEBLOCKS_ENABLED && provider) {
    extensions.push(
      Collaboration.configure({
        document: yDoc,
      })
    );

    extensions.push(
      CollaborationCursor.configure({
        provider: provider as any,
        user: userInfo || { name: "Anonymous", color: "#8a8680" },
      })
    );
  }

  const editor = useEditor({
    extensions,
    content:
      !LIVEBLOCKS_ENABLED || !provider
        ? initialContent || "<p>Start planning... type <code>/</code> to mention entities.</p>"
        : undefined,
    editorProps: {
      attributes: {
        class: "waypoint-notes-editor",
        spellcheck: "false",
      },
    },
  }, [provider, LIVEBLOCKS_ENABLED]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Track cursor position for presence
  useEffect(() => {
    if (!editor || !updateMyPresence) return;

    const updateCursor = () => {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const editorRect = editor.view.dom.getBoundingClientRect();

      updateMyPresence({
        cursor: {
          x: coords.left,
          y: coords.top,
          anchorX: editorRect.left,
          anchorY: editorRect.top,
        },
      });
    };

    // Update on selection change
    editor.on("selectionUpdate", updateCursor);

    return () => {
      editor.off("selectionUpdate", updateCursor);
    };
  }, [editor, updateMyPresence]);

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
