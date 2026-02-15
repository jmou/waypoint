/**
 * TipTap extension: SlashCommand
 *
 * Triggered by "/" in the editor. Uses a ProseMirror plugin to track
 * the slash state and a React-rendered floating popover positioned
 * at the cursor. No tippy.js dependency.
 *
 * Priority order: unmentioned entities > mentioned entities > create new.
 * On selection, inserts an EntityChip node.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import React, { useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { Entity, EntityId } from "../entities/types";

// ─── Types ───

export interface SlashCommandItem {
  id: string;
  entity?: Entity;
  action?: "create-place" | "create-experience";
  label: string;
  type: "place" | "experience";
  mentioned: boolean;
}

export interface SlashCommandOptions {
  getEntities: () => Map<EntityId, Entity>;
  getMentionedIds: () => Set<EntityId>;
  onCreate: (type: "place" | "experience", name: string) => EntityId;
}

const PLUGIN_KEY = new PluginKey("slashCommand");

// ─── Extension ───

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      getEntities: () => new Map(),
      getMentionedIds: () => new Set(),
      onCreate: () => "",
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;

    let popoverEl: HTMLDivElement | null = null;
    let popoverRoot: Root | null = null;
    let active = false;
    let slashPos = -1; // position of the "/" character

    function getQuery(): string {
      if (!active || slashPos < 0) return "";
      const { from } = editor.state.selection;
      if (from <= slashPos) return "";
      return editor.state.doc.textBetween(slashPos + 1, from, "\n", "\0");
    }

    function buildItems(query: string): SlashCommandItem[] {
      const entities = options.getEntities();
      const mentionedIds = options.getMentionedIds();
      const q = query.toLowerCase();

      const unmentioned: SlashCommandItem[] = [];
      const mentioned: SlashCommandItem[] = [];

      for (const [id, entity] of entities) {
        if (!entity.parentId) continue;
        if (q && !entity.name.toLowerCase().includes(q)) continue;

        const item: SlashCommandItem = {
          id: entity.id, entity, label: entity.name,
          type: entity.type, mentioned: mentionedIds.has(id),
        };
        (mentionedIds.has(id) ? mentioned : unmentioned).push(item);
      }

      const items: SlashCommandItem[] = [
        ...unmentioned.slice(0, 5),
        ...mentioned.slice(0, 3),
      ];

      const createLabel = query || "Untitled";
      items.push({ id: "__create-place", action: "create-place", label: createLabel, type: "place", mentioned: false });
      items.push({ id: "__create-experience", action: "create-experience", label: createLabel, type: "experience", mentioned: false });
      return items;
    }

    function selectItem(item: SlashCommandItem) {
      const { from } = editor.state.selection;
      const range = { from: slashPos, to: from };

      if (item.action) {
        const type = item.action === "create-place" ? "place" : "experience";
        const id = options.onCreate(type, item.label);
        editor.chain().focus().deleteRange(range)
          .insertContent({ type: "entityChip", attrs: { entityId: id } })
          .insertContent(" ").run();
      } else if (item.entity) {
        editor.chain().focus().deleteRange(range)
          .insertContent({ type: "entityChip", attrs: { entityId: item.entity.id } })
          .insertContent(" ").run();
      }
      close();
    }

    function render() {
      if (!active || !popoverEl || !popoverRoot) return;
      const query = getQuery();
      const items = buildItems(query);
      popoverRoot.render(
        React.createElement(SlashPopover, { items, query, onSelect: selectItem, onClose: close })
      );
    }

    function open(coords: { left: number; bottom: number }) {
      if (!popoverEl) {
        popoverEl = document.createElement("div");
        popoverEl.style.cssText = "position:fixed;z-index:1000;";
        document.body.appendChild(popoverEl);
        popoverRoot = createRoot(popoverEl);
      }
      popoverEl.style.left = `${coords.left}px`;
      popoverEl.style.top = `${coords.bottom + 4}px`;
      active = true;
    }

    function close() {
      active = false;
      slashPos = -1;
      popoverRoot?.render(null);
    }

    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          handleKeyDown(_view, event) {
            if (!active) return false;
            if (event.key === "Escape") { close(); return true; }
            // Arrow keys and Enter are handled by the popover's keydown listener
            return false;
          },
          handleTextInput(view, from, _to, text) {
            if (text === "/") {
              slashPos = from;
              const coords = view.coordsAtPos(from);
              open(coords);
              setTimeout(render, 0);
            } else if (active) {
              setTimeout(render, 0);
            }
            return false;
          },
        },
        view() {
          return {
            update() { if (active) setTimeout(render, 0); },
            destroy() {
              if (popoverEl) { popoverRoot?.unmount(); document.body.removeChild(popoverEl); popoverEl = null; }
            },
          };
        },
      }),
    ];
  },
});

// ─── Popover ───

interface SlashPopoverProps {
  items: SlashCommandItem[];
  query: string;
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}

function SlashPopover({ items, query, onSelect, onClose }: SlashPopoverProps) {
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [items.length, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => (i + items.length - 1) % items.length); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => (i + 1) % items.length); }
      else if (e.key === "Enter") { e.preventDefault(); items[sel] && onSelect(items[sel]); }
      else if (e.key === "Escape") { onClose(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [items, sel, onSelect, onClose]);

  if (!items.length) return null;

  const unmentioned = items.filter((i) => !i.mentioned && !i.action);
  const mentioned = items.filter((i) => i.mentioned && !i.action);
  const creates = items.filter((i) => i.action);
  let gi = 0;

  const row = (item: SlashCommandItem) => {
    const idx = gi++;
    const active = idx === sel;
    return (
      <div key={item.id} onClick={() => onSelect(item)}
        style={{ padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "var(--font-ui)", background: active ? "var(--color-surface-alt)" : "transparent", opacity: item.mentioned ? 0.6 : 1 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-alt)")}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ color: item.type === "place" ? "var(--color-accent)" : "var(--color-blue)", display: "flex", width: 16, justifyContent: "center", fontSize: 11 }}>
          {item.action ? "+" : item.type === "place" ? "◉" : "▸"}
        </span>
        <span style={{ color: "var(--color-text)", flex: 1 }}>
          {item.action ? `New ${item.type}` : item.label}
        </span>
        {!item.action && <span style={{ fontSize: 9, color: item.type === "place" ? "var(--color-accent)" : "var(--color-blue)" }}>{item.type}</span>}
      </div>
    );
  };

  const sectionHeader = (label: string) => (
    <div style={{ padding: "4px 12px", fontSize: 10, fontWeight: 600, color: "var(--color-text-dim, #8a8680)", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontFamily: "var(--font-ui)" }}>{label}</div>
  );
  const divider = <div style={{ height: 1, background: "var(--color-border, rgba(0,0,0,0.09))", margin: "4px 0" }} />;

  return (
    <div style={{ background: "var(--color-surface,#fff)", border: "1px solid var(--color-border-strong,rgba(0,0,0,.16))", borderRadius: 8, padding: "6px 0", width: 280, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 300, overflow: "auto" }}>
      {unmentioned.length > 0 && <>{sectionHeader("Not yet mentioned")}{unmentioned.map(row)}{divider}</>}
      {mentioned.length > 0 && <>{sectionHeader("Already mentioned")}{mentioned.map(row)}{divider}</>}
      {sectionHeader(`Create new${query ? ` "${query}"` : ""}`)}
      {creates.map(row)}
    </div>
  );
}
