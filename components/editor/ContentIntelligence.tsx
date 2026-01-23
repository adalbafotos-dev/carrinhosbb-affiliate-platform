"use client";

import { useMemo } from "react";
import { CheckCircle2, Circle, FileText, Image as ImageIcon, Link2, Sparkles } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function ContentIntelligence() {
  const { outline, links, meta, docText, onJumpToHeading, setMeta, onOpenHeroPicker, onOpenMedia } = useEditorContext();

  const lsiTerms = useMemo(() => {
    const list = Array.from(new Set([...meta.supportingKeywords, ...meta.entities].filter(Boolean)));
    const text = normalize(docText);
    return list.map((term) => ({ term, used: text.includes(normalize(term)) }));
  }, [docText, meta.entities, meta.supportingKeywords]);

  const internalLinks = links.filter((l) => ["internal", "mention", "about"].includes(l.type));

  return (
    <aside className="flex h-full w-[320px] flex-col border-r border-zinc-900 bg-zinc-900">
      <div className="border-b border-zinc-900 px-4 py-3 text-[11px] font-semibold uppercase text-zinc-400">Inteligência</div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase text-zinc-400">
            <FileText size={14} />
            Outline (H2/H3/H4)
          </h3>
          <div className="mt-3 space-y-1 border-l border-zinc-800 pl-3">
            {outline.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum heading.</p>
            ) : (
              outline.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToHeading(item.pos)}
                  className={`block w-full truncate text-left text-xs text-zinc-200 hover:text-emerald-400 ${
                    item.level === 3 ? "pl-3 text-zinc-400" : item.level === 4 ? "pl-5 text-zinc-500" : ""
                  }`}
                >
                  {item.text}
                </button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <Sparkles size={14} />
              LSI / Entidades
            </span>
            <span className="text-[10px] text-zinc-500">{lsiTerms.length} termos</span>
          </div>
          <textarea
            value={meta.supportingKeywords.join("\n")}
            onChange={(event) =>
              setMeta({ supportingKeywords: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })
            }
            className="h-20 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[12px] text-zinc-100 outline-none placeholder:text-zinc-600"
            placeholder="Supporting (1 por linha)"
          />
          <textarea
            value={meta.entities.join("\n")}
            onChange={(event) => setMeta({ entities: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
            className="h-20 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[12px] text-zinc-100 outline-none placeholder:text-zinc-600"
            placeholder="Entidades (1 por linha)"
          />
          <div className="space-y-1">
            {lsiTerms.length === 0 ? (
              <p className="text-[11px] text-zinc-500">Adicione termos para acompanhar uso.</p>
            ) : (
              lsiTerms.map((item) => (
                <div
                  key={item.term}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                    item.used ? "bg-emerald-900/40 text-emerald-100 line-through" : "bg-zinc-900 text-zinc-200"
                  }`}
                >
                  <span>{item.term}</span>
                  {item.used ? <CheckCircle2 size={12} /> : <Circle size={12} className="text-zinc-600" />}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <Link2 size={14} />
              Links Internos
            </span>
            <span className="text-[10px] text-zinc-500">{internalLinks.length}</span>
          </div>
          <div className="space-y-2">
            {internalLinks.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum link interno.</p>
            ) : (
              internalLinks.map((link) => (
                <div key={link.id} className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2">
                  <p className="truncate text-xs font-medium text-zinc-100">{link.text || link.href}</p>
                  <p className="truncate text-[10px] text-zinc-500">{link.href}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-zinc-400">
            <ImageIcon size={14} />
            Mídia
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onOpenHeroPicker}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-xs font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-200"
            >
              Selecionar hero
            </button>
            <button
              type="button"
              onClick={onOpenMedia}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-xs font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-200"
            >
              Inserir imagem no corpo
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
