/**
 * CollaborativeNotesEditor — TipTap editor with PartyKit collaboration.
 *
 * When PartyKit is enabled, this wraps the NotesEditor with:
 * - Yjs document sync via YPartyKitProvider
 * - Collaborative cursors showing other users' positions
 * - Awareness state for presence
 */

import React, { useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";
import { useParty } from "../partykit/Party";
import { PARTYKIT_ENABLED } from "../partykit/config";
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

  // Get PartyKit context (provider, yDoc, userInfo)
  const partyCtx = PARTYKIT_ENABLED ? useParty() : null;
  const provider = partyCtx?.provider ?? null;
  const yDoc = partyCtx?.yDoc ?? null;
  const userInfo = partyCtx?.userInfo ?? null;

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
      // Disable history when using collaboration (Yjs handles undo/redo)
      history: PARTYKIT_ENABLED ? false : undefined,
    }),
    EntityChipExtension.configure({ onNavigate }),
    SlashCommandExtension.configure({
      getEntities,
      getMentionedIds,
      onCreate: handleCreate,
    }),
    createParagraphHighlightExtension(),
  ];

  // Add collaboration extensions if PartyKit is enabled
  if (PARTYKIT_ENABLED && provider && yDoc) {
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
      !PARTYKIT_ENABLED || !provider
        ? initialContent || "<p>Start planning... type <code>/</code> to mention entities.</p>"
        : undefined,
    editorProps: {
      attributes: {
        class: "waypoint-notes-editor",
        spellcheck: "false",
      },
    },
  }, [provider, PARTYKIT_ENABLED]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Broadcast selection via awareness
  useEffect(() => {
    if (!provider) return;
    provider.awareness.setLocalStateField("selectedIds", Array.from(selected));
  }, [selected, provider]);

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
