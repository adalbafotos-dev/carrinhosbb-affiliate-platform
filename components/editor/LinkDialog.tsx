"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { Check, ExternalLink, Link as LinkIcon, Search, X } from "lucide-react";

type Props = {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
};

type LinkType = "internal" | "external" | "affiliate" | "about" | "mention";

type InternalResult = {
  id: string;
  title: string;
  slug: string;
  siloSlug: string;
};

function parseRel(rel?: string) {
  const parts = (rel ?? "").split(/\s+/).map((s) => s.trim()).filter(Boolean);
  return new Set(parts);
}

export function LinkDialog({ editor, open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("external");
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [sponsored, setSponsored] = useState(false);
  const [aboutEntity, setAboutEntity] = useState(false);
  const [mentionEntity, setMentionEntity] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InternalResult[]>([]);
  const [searching, setSearching] = useState(false);

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
    const type = (attrs["data-link-type"] as LinkType | undefined) ?? "";
    const entity = attrs["data-entity"] ?? attrs["data-entity-type"];

    setUrl(href);
    setText(selectedText);
    setOpenInNewTab(attrs.target === "_blank");
    setNofollow(rel.has("nofollow"));
    setSponsored(rel.has("sponsored"));
    setAboutEntity(rel.has("about") || entity === "about");
    setMentionEntity(rel.has("mention") || entity === "mention");
    setPostId(attrs["data-post-id"] ?? null);

    if (type) {
      setLinkType(type);
    } else if (entity === "about" || rel.has("about")) {
      setLinkType("about");
    } else if (entity === "mention" || rel.has("mention")) {
      setLinkType("mention");
    } else if (rel.has("sponsored")) {
      setLinkType("affiliate");
    } else if (href.startsWith("/")) {
      setLinkType("internal");
    } else {
      setLinkType("external");
    }
  }, [editor, open, selectedText]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetch(`/api/admin/mentions?q=${encodeURIComponent(term)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setResults((data.items ?? []) as InternalResult[]);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, search]);

  function handleTypeChange(next: LinkType) {
    setLinkType(next);
    if (next === "affiliate") {
      setSponsored(true);
      setNofollow(true);
      setOpenInNewTab(true);
    }
    if (next === "external") {
      setOpenInNewTab(true);
    }
    if (next === "internal") {
      setOpenInNewTab(false);
    }
    if (next === "about") {
      setUrl("/sobre");
      setAboutEntity(true);
      setMentionEntity(false);
    }
    if (next === "mention") {
      setMentionEntity(true);
      setAboutEntity(false);
      setOpenInNewTab(false);
    }
  }

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
    if (sponsored || linkType === "affiliate") relTokens.add("sponsored");
    if (aboutEntity || linkType === "about") relTokens.add("about");
    if (openInNewTab) {
      relTokens.add("noopener");
      relTokens.add("noreferrer");
    }

    const rel = Array.from(relTokens).join(" ") || null;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const displayText = text.trim() || selectedText || href;

    const attrs = {
      href,
      target: openInNewTab ? "_blank" : null,
      rel,
      "data-link-type": linkType,
      "data-post-id": linkType === "mention" ? postId : null,
      "data-entity-type": aboutEntity ? "about" : mentionEntity ? "mention" : null,
      "data-entity": aboutEntity ? "about" : mentionEntity ? "mention" : null,
    };

    if (!hasSelection) {
      editor.chain().focus().insertContent(displayText).extendMarkRange("link").setLink(attrs).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, displayText)
        .setTextSelection({ from, to: from + displayText.length })
        .setLink(attrs)
        .run();
    }

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
            <LinkIcon size={16} />
            Super Link
          </div>
          <button type="button" onClick={onClose} className="text-[color:var(--muted-2)] hover:text-[color:var(--muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="text-xs font-semibold uppercase text-[color:var(--muted-2)]">Tipo do link</label>
            <select
              value={linkType}
              onChange={(event) => handleTypeChange(event.target.value as LinkType)}
              className="mt-2 w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            >
              <option value="internal">Interno</option>
              <option value="external">Externo</option>
              <option value="affiliate">Afiliado</option>
              <option value="about">About</option>
              <option value="mention">Mention</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[color:var(--muted-2)]">URL</label>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="mt-2 w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
              placeholder="https://..."
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[color:var(--muted-2)]">Texto do link</label>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="mt-2 w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
              placeholder={selectedText || "Texto visivel"}
            />
          </div>

          <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
            <p className="text-[11px] font-semibold uppercase text-[color:var(--muted-2)]">Relacionamento</p>
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
                checked={sponsored || linkType === "affiliate"}
                onChange={setSponsored}
                tone="accent"
                disabled={linkType === "affiliate"}
              />
              <Toggle
                label="About (Entidade)"
                checked={aboutEntity}
                onChange={setAboutEntity}
                tone="purple"
              />
              <Toggle
                label="Mention (Entidade)"
                checked={mentionEntity}
                onChange={setMentionEntity}
                tone="blue"
              />
            </div>
          </div>

          <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
            <p className="text-[11px] font-semibold uppercase text-[color:var(--muted-2)]">Buscar posts internos</p>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-2">
              <Search size={14} className="text-[color:var(--muted-2)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por titulo"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
            {searching ? (
              <p className="mt-2 text-xs text-[color:var(--muted-2)]">Buscando...</p>
            ) : results.length === 0 ? (
              <p className="mt-2 text-xs text-[color:var(--muted-2)]">Nenhum resultado.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setUrl(`/${item.siloSlug}/${item.slug}`);
                      setText(item.title);
                      setPostId(item.id);
                      setLinkType("internal");
                    }}
                    className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-left text-xs text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)]"
                  >
                    <p className="font-medium text-[color:var(--text)]">{item.title}</p>
                    <p className="text-[10px] text-[color:var(--muted-2)]">/{item.siloSlug}/{item.slug}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] bg-[color:var(--surface-muted)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[color:var(--border)] px-3 py-2 text-xs font-semibold text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-md bg-[color:var(--brand-hot)] px-4 py-2 text-xs font-semibold text-[color:var(--paper)] hover:bg-[color:var(--brand-accent)]"
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
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: ReactNode;
  tone?: "accent" | "purple" | "blue";
  disabled?: boolean;
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
        : tone === "blue"
          ? checked
            ? "text-blue-600"
            : "text-blue-500"
          : checked
            ? "text-[color:var(--text)]"
            : "text-[color:var(--muted)]";

  return (
    <label className={`group flex items-center justify-between text-sm ${disabled ? "opacity-60" : ""}`}>
      <span className={`flex items-center gap-2 ${toneClass} group-hover:text-[color:var(--text)]`}>
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => (disabled ? null : onChange(!checked))}
        className={`relative h-5 w-10 rounded-full transition ${checked ? "bg-[color:var(--brand-hot)]" : "bg-[color:var(--border-strong)]"
          }`}
        disabled={disabled}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[color:var(--surface)] transition ${checked ? "translate-x-5" : "translate-x-1"
            }`}
        />
      </button>
    </label>
  );
}
