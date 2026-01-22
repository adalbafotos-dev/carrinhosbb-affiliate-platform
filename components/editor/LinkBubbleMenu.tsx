"use client";

import { BubbleMenu, Editor } from "@tiptap/react";
import { Bold, ExternalLink, Info, Italic, Link2, Strikethrough, Tag, Trash2, Underline } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type EntityType = "about" | "mention" | null;

function parseRel(rel?: string) {
  const parts = (rel ?? "").split(/\s+/).map((s) => s.trim()).filter(Boolean);
  return new Set(parts);
}

function buildRel(tokens: Set<string>) {
  return Array.from(tokens).join(" ").trim();
}

export function LinkBubbleMenu({
  editor,
  forceOpen = false,
  onClose,
}: {
  editor: Editor;
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const [href, setHref] = useState("");
  const [targetBlank, setTargetBlank] = useState(false);
  const [nofollow, setNofollow] = useState(false);
  const [sponsored, setSponsored] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>(null);

  const syncFromEditor = useCallback(() => {
    const attrs = editor.getAttributes("link") as any;
    const relSet = parseRel(attrs.rel);
    setHref(attrs.href ?? "");
    setTargetBlank(attrs.target === "_blank");
    setNofollow(relSet.has("nofollow"));
    setSponsored(relSet.has("sponsored"));

    const entity = attrs["data-entity-type"];
    if (entity === "about" || entity === "mention") {
      setEntityType(entity);
    } else {
      setEntityType(null);
    }
  }, [editor]);

  useEffect(() => {
    syncFromEditor();
    const handler = () => syncFromEditor();
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor, syncFromEditor]);

  useEffect(() => {
    if (!forceOpen || !onClose) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [forceOpen, onClose]);

  const apply = useCallback(
    (next: Partial<{ href: string; targetBlank: boolean; nofollow: boolean; sponsored: boolean; entity: EntityType }> = {}) => {
      const current = editor.getAttributes("link") as any;
      const tokens = parseRel(current.rel);

      const nextHref = (typeof next.href === "string" ? next.href : href || current.href || "").trim();
      if (!nextHref) {
        if (editor.isActive("link")) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
        }
        return;
      }

      const nextTarget = typeof next.targetBlank === "boolean" ? next.targetBlank : targetBlank;
      const nextNofollow = typeof next.nofollow === "boolean" ? next.nofollow : nofollow;
      const nextSponsored = typeof next.sponsored === "boolean" ? next.sponsored : sponsored;
      const nextEntity = typeof next.entity !== "undefined" ? next.entity : entityType;

      nextNofollow ? tokens.add("nofollow") : tokens.delete("nofollow");
      nextSponsored ? tokens.add("sponsored") : tokens.delete("sponsored");

      if (nextTarget) {
        tokens.add("noopener");
        tokens.add("noreferrer");
      } else {
        tokens.delete("noopener");
        tokens.delete("noreferrer");
      }

      if (nextEntity === "about") {
        tokens.add("about");
        tokens.delete("mentions");
      } else if (nextEntity === "mention") {
        tokens.add("mentions");
        tokens.delete("about");
      } else {
        tokens.delete("about");
        tokens.delete("mentions");
      }

      const rel = buildRel(tokens) || null;

      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: nextHref,
          target: nextTarget ? "_blank" : null,
          rel,
          "data-entity-type": nextEntity,
        })
        .run();
    },
    [editor, entityType, href, nofollow, sponsored, targetBlank]
  );

  const showMenu = forceOpen || (!editor.isDestroyed && (editor.isActive("link") || !editor.state.selection.empty));

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={() => showMenu}
      tippyOptions={{ duration: 100, maxWidth: 420, placement: "bottom" }}
      className="w-[320px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl"
    >
      <div className="flex flex-col gap-3 text-xs text-zinc-900">
        <div className="flex items-center gap-2">
          <FormatButton
            label="Negrito"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={14} />
          </FormatButton>
          <FormatButton
            label="Italico"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={14} />
          </FormatButton>
          <FormatButton
            label="Sublinhado"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline size={14} />
          </FormatButton>
          <FormatButton
            label="Riscado"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={14} />
          </FormatButton>
          {forceOpen && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100"
            >
              Fechar
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2">
          <Link2 size={14} className="text-zinc-400" />
          <input
            type="text"
            placeholder="Cole a URL..."
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onBlur={() => apply({ href })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply({ href });
              }
            }}
            className="flex-1 bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={() => apply({ href })}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-zinc-100"
            aria-label="Remover link"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Toggle
            label="Nova aba"
            active={targetBlank}
            icon={<ExternalLink size={14} />}
            onClick={() => {
              const next = !targetBlank;
              setTargetBlank(next);
              apply({ targetBlank: next });
            }}
          />

          <Toggle
            label="Nofollow"
            active={nofollow}
            onClick={() => {
              const next = !nofollow;
              setNofollow(next);
              apply({ nofollow: next });
            }}
          />

          <Toggle
            label="Sponsored"
            active={sponsored}
            tone="accent"
            onClick={() => {
              const next = !sponsored;
              setSponsored(next);
              apply({ sponsored: next });
            }}
          />

          <Toggle
            label="Sobre"
            active={entityType === "about"}
            icon={<Info size={14} />}
            onClick={() => {
              const next = entityType === "about" ? null : "about";
              setEntityType(next);
              apply({ entity: next });
            }}
          />

          <Toggle
            label="Mentions"
            active={entityType === "mention"}
            icon={<Tag size={14} />}
            onClick={() => {
              const next = entityType === "mention" ? null : "mention";
              setEntityType(next);
              apply({ entity: next });
            }}
          />
        </div>
      </div>
    </BubbleMenu>
  );
}

function Toggle(props: {
  label: string;
  active: boolean;
  icon?: ReactNode;
  tone?: "accent" | "default";
  onClick: () => void;
}) {
  const toneClass =
    props.tone === "accent"
      ? props.active
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-zinc-200 text-orange-600"
      : props.active
        ? "border-zinc-300 bg-zinc-100 text-zinc-900"
        : "border-zinc-200 text-zinc-500";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${toneClass}`}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function FormatButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-lg border px-2 py-1 text-[11px] ${props.active ? "border-zinc-300 bg-zinc-100 text-zinc-900" : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100"}`}
      title={props.label}
    >
      {props.children}
    </button>
  );
}
