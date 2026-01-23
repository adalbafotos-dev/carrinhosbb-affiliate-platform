"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, FileText, Link2, Zap } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";

export function ContentIntelligence() {
  const { outline, links, meta, docText, onJumpToHeading, editor } = useEditorContext();
  const [tab, setTab] = useState<"outline" | "lsi" | "links">("outline");

  const lsiTerms = useMemo(() => {
    const list = Array.from(new Set([...meta.supportingKeywords, ...meta.entities].filter(Boolean)));
    const norm = (v: string) =>
      v
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const text = norm(docText);
    return list.map((term) => ({ term, used: text.includes(norm(term)) }));
  }, [docText, meta.entities, meta.supportingKeywords]);

  const internalLinks = links.filter((l) => ["internal", "mention", "about"].includes(l.type));

  return (
    <aside className="flex h-full w-[300px] flex-col border-r border-zinc-200 bg-white">
      <div className="flex border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500">
        <button
          onClick={() => setTab("outline")}
          className={`flex-1 py-3 ${tab === "outline" ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-400"}`}
        >
          Estrutura
        </button>
        <button
          onClick={() => setTab("lsi")}
          className={`flex-1 py-3 ${tab === "lsi" ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-400"}`}
        >
          Palavras
        </button>
        <button
          onClick={() => setTab("links")}
          className={`flex-1 py-3 ${tab === "links" ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-400"}`}
        >
          Links
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {tab === "outline" ? (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400">
              <FileText size={14} />
              Outline
            </h3>
            <div className="mt-3 space-y-1 border-l border-zinc-100 pl-3">
              {outline.length === 0 ? (
                <p className="text-xs text-zinc-400">Nenhum heading.</p>
              ) : (
                outline.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onJumpToHeading(item.pos)}
                    className={`block w-full truncate text-left text-xs text-zinc-600 hover:text-blue-600 ${
                      item.level === 3 ? "pl-3 text-zinc-500" : item.level === 4 ? "pl-5 text-zinc-400" : ""
                    }`}
                  >
                    {item.text}
                  </button>
                ))
              )}
            </div>
          </section>
        ) : null}

        {tab === "lsi" ? (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400">
              <Zap size={14} />
              Palavras / Entidades
            </h3>
            <p className="mt-2 text-[10px] text-zinc-400">Use termos relacionados sem repetir demais.</p>
            <div className="mt-3 space-y-2">
              {lsiTerms.length === 0 ? (
                <p className="text-xs text-zinc-400">Adicione supporting/entidades.</p>
              ) : (
                lsiTerms.map((item) => (
                  <div
                    key={item.term}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                      item.used
                        ? "bg-emerald-50 text-emerald-700 line-through"
                        : "bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    <span>{item.term}</span>
                    {item.used ? <CheckCircle2 size={12} /> : <Circle size={12} className="text-zinc-300" />}
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {tab === "links" ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-400">
              <Link2 size={14} />
              Links internos
            </h3>
            <div className="space-y-2">
              {internalLinks.length === 0 ? (
                <p className="text-xs text-zinc-400">Nenhum link interno.</p>
              ) : (
                internalLinks.map((link) => (
                  <div key={link.id} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2">
                    <p className="text-xs font-medium text-zinc-700 truncate">{link.text || link.href}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{link.href}</p>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!editor) return;
                const href = window.prompt("Cole a URL interna");
                if (!href) return;
                editor.chain().focus().setLink({ href, target: null }).run();
              }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Inserir link manual
            </button>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
