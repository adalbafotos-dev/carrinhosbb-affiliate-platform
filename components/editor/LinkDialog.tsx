"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { Check, ExternalLink, Link as LinkIcon, X } from "lucide-react";

type Props = {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
};

function parseRel(rel?: string) {
  const parts = (rel ?? "").split(/\s+/).map((s) => s.trim()).filter(Boolean);
  return new Set(parts);
}

export function LinkDialog({ editor, open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [sponsored, setSponsored] = useState(false);
  const [isAbout, setIsAbout] = useState(false);

  const selectedText = useMemo(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor, open]);

  useEffect(() => {
    if (!open || !editor) return;
    const attrs = editor.getAttributes("link") as any;
    const rel = parseRel(attrs.rel);
    const href = attrs.href ?? "";
    setUrl(href);
    setOpenInNewTab(attrs.target === "_blank" || /^https?:\/\//i.test(href));
    setNofollow(rel.has("nofollow"));
    setSponsored(rel.has("sponsored"));
    setIsAbout(attrs["data-entity-type"] === "about");
    setText(selectedText);
  }, [editor, open, selectedText]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function apply() {
    if (!editor) return;
    const href = url.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
      onClose();
      return;
    }

    const relTokens = new Set<string>();
    if (nofollow) relTokens.add("nofollow");
    if (sponsored) relTokens.add("sponsored");
    if (openInNewTab) {
      relTokens.add("noopener");
      relTokens.add("noreferrer");
    }
    const rel = Array.from(relTokens).join(" ") || null;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const displayText = text.trim() || selectedText || href;

    if (!hasSelection) {
      editor
        .chain()
        .focus()
        .insertContent(displayText)
        .extendMarkRange("link")
        .setLink({
          href,
          target: openInNewTab ? "_blank" : null,
          rel,
          "data-entity-type": isAbout ? "about" : null,
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, displayText)
        .setTextSelection({ from, to: from + displayText.length })
        .setLink({
          href,
          target: openInNewTab ? "_blank" : null,
          rel,
          "data-entity-type": isAbout ? "about" : null,
        })
        .run();
    }

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <LinkIcon size={16} />
            Super Link
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="https://..."
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Texto do link</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder={selectedText || "Texto visível"}
            />
          </div>

          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">Relacionamento</p>
            <div className="mt-3 space-y-3">
              <Toggle
                label="Abrir em nova aba"
                checked={openInNewTab}
                onChange={setOpenInNewTab}
                icon={<ExternalLink size={14} />}
              />
              <Toggle label="Nofollow (SEO)" checked={nofollow} onChange={setNofollow} />
              <Toggle
                label="Sponsored (Afiliado)"
                checked={sponsored}
                onChange={setSponsored}
                tone="accent"
              />
              <Toggle
                label="Is Entity (About)"
                checked={isAbout}
                onChange={setIsAbout}
                tone="purple"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            <Check size={14} />
            Aplicar link
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  icon,
  tone,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: ReactNode;
  tone?: "accent" | "purple";
}) {
  const toneClass =
    tone === "accent"
      ? checked
        ? "text-orange-600"
        : "text-orange-500"
      : tone === "purple"
        ? checked
          ? "text-purple-600"
          : "text-purple-500"
        : checked
          ? "text-zinc-800"
          : "text-zinc-600";

  return (
    <label className="group flex items-center justify-between text-sm">
      <span className={`flex items-center gap-2 ${toneClass} group-hover:text-zinc-800`}>
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-10 rounded-full transition ${
          checked ? "bg-zinc-900" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
