"use client";

import { useMemo, useState } from "react";
import { Link2, RefreshCcw, Search, Sparkles } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { Editor } from "@tiptap/react";

type LinkSuggestion = {
  postId: string;
  title: string;
  url: string;
  slug: string;
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
  score: number;
  semanticScore: number;
  hierarchyScore: number;
  anchorText: string;
  reason: string;
  source: "ai" | "heuristic";
  alreadyLinked: boolean;
};

type AutoPlanItem = {
  suggestion: LinkSuggestion;
  status: "pending" | "applied" | "skipped";
  note: string;
};

function roleBadge(role: LinkSuggestion["role"]) {
  if (role === "PILLAR") return "bg-amber-100 text-amber-700";
  if (role === "SUPPORT") return "bg-blue-100 text-blue-700";
  if (role === "AUX") return "bg-slate-100 text-slate-700";
  return "bg-gray-100 text-gray-700";
}

function roleLabel(role: LinkSuggestion["role"]) {
  if (role === "PILLAR") return "Pilar";
  if (role === "SUPPORT") return "Suporte";
  if (role === "AUX") return "Aux";
  return "Sem papel";
}

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-700";
  if (score >= 55) return "text-amber-700";
  return "text-red-700";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function findFirstUnlinkedTermRange(editor: Editor, term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return null;

  let found: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText || !node.text) return true;
    if (node.marks.some((mark) => mark.type.name === "link")) return true;
    const index = node.text.toLowerCase().indexOf(needle);
    if (index >= 0) found = { from: pos + index, to: pos + index + term.length };
    return true;
  });
  return found;
}

export function InternalLinksPanel() {
  const { docText, editor, meta, postId, links } = useEditorContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [search, setSearch] = useState("");
  const [autoPlan, setAutoPlan] = useState<AutoPlanItem[] | null>(null);
  const [autoApplying, setAutoApplying] = useState(false);
  const [autoSummary, setAutoSummary] = useState<{ applied: number; skipped: number } | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suggestions;
    return suggestions.filter((item) => item.title.toLowerCase().includes(term) || item.anchorText.toLowerCase().includes(term));
  }, [search, suggestions]);

  const runSuggestions = async () => {
    if (!editor) return;
    if (!meta.siloId) {
      setError("Defina um silo no post para gerar links internos hierarquicos.");
      setSuggestions([]);
      return;
    }

    const text = editor.getText().trim() || docText.trim();
    if (!text || text.split(/\s+/).filter(Boolean).length < 80) {
      setError("Escreva pelo menos 80 palavras para gerar sugestoes.");
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/internal-link-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          siloId: meta.siloId,
          title: meta.title,
          keyword: meta.targetKeyword,
          text,
          existingLinks: links.map((link) => ({
            href: link.href,
            dataPostId: link.dataPostId ?? null,
            type: link.type,
          })),
          maxSuggestions: 8,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.message || json?.error || "Falha ao gerar links internos.");
        setSuggestions([]);
        setSource("");
        setAutoPlan(null);
        setAutoSummary(null);
        return;
      }

      setSuggestions(Array.isArray(json?.suggestions) ? (json.suggestions as LinkSuggestion[]) : []);
      setSource(String(json?.source || ""));
      setAutoPlan(null);
      setAutoSummary(null);
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao gerar links internos.");
      setSuggestions([]);
      setSource("");
      setAutoPlan(null);
      setAutoSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: LinkSuggestion) => {
    if (!editor) return;
    const attrs = {
      href: suggestion.url,
      target: null,
      rel: null,
      "data-link-type": "internal",
      "data-post-id": suggestion.postId,
    } as any;

    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().setLink(attrs).run();
      return;
    }

    const anchor = suggestion.anchorText?.trim() || suggestion.title;
    const naturalRange = findFirstUnlinkedTermRange(editor, anchor);
    if (naturalRange) {
      editor.chain().focus().setTextSelection(naturalRange).setLink(attrs).run();
      return;
    }

    const html = `<a href="${escapeAttr(suggestion.url)}" data-link-type="internal" data-post-id="${escapeAttr(
      suggestion.postId
    )}">${escapeHtml(anchor)}</a> `;
    editor.chain().focus().insertContent(html).run();
  };

  const buildAutoPlan = () => {
    const prioritized = suggestions
      .filter((item) => !item.alreadyLinked)
      .sort((a, b) => b.score - a.score);

    if (!prioritized.length) {
      setAutoPlan([]);
      setAutoSummary(null);
      return;
    }

    const chosen: LinkSuggestion[] = [];
    const addIfUnique = (candidate?: LinkSuggestion) => {
      if (!candidate) return;
      if (chosen.some((item) => item.postId === candidate.postId)) return;
      chosen.push(candidate);
    };

    addIfUnique(prioritized.find((item) => item.role === "PILLAR"));
    addIfUnique(prioritized.find((item) => item.role === "SUPPORT"));
    prioritized.forEach((item) => {
      if (chosen.length >= 3) return;
      addIfUnique(item);
    });

    setAutoPlan(
      chosen.slice(0, 3).map((suggestion) => ({
        suggestion,
        status: "pending",
        note: "Aguardando confirmacao",
      }))
    );
    setAutoSummary(null);
  };

  const applyAutoPlan = async () => {
    if (!editor || !autoPlan?.length) return;
    setAutoApplying(true);

    const attrsFor = (suggestion: LinkSuggestion) =>
      ({
        href: suggestion.url,
        target: null,
        rel: null,
        "data-link-type": "internal",
        "data-post-id": suggestion.postId,
      }) as any;

    let applied = 0;
    let skipped = 0;

    const next: AutoPlanItem[] = autoPlan.map((item) => {
      const suggestion = item.suggestion;
      const attrs = attrsFor(suggestion);
      const anchorCandidates = [suggestion.anchorText, suggestion.title].filter(Boolean);

      let range: { from: number; to: number } | null = null;
      let anchorUsed = "";
      for (const candidate of anchorCandidates) {
        range = findFirstUnlinkedTermRange(editor, candidate);
        if (range) {
          anchorUsed = candidate;
          break;
        }
      }

      if (!range) {
        skipped += 1;
        return {
          ...item,
          status: "skipped",
          note: "Sem ocorrencia natural para esta ancora",
        };
      }

      editor.chain().focus().setTextSelection(range).setLink(attrs).run();
      applied += 1;
      return {
        ...item,
        status: "applied",
        note: `Aplicado em: \"${anchorUsed}\"`,
      };
    });

    setAutoPlan(next);
    setAutoSummary({ applied, skipped });
    setAutoApplying(false);
  };

  const cancelAutoPlan = () => {
    setAutoPlan(null);
    setAutoSummary(null);
  };

  return (
    <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-1.5">
          <Link2 size={14} />
          Links Internos IA
        </span>
        <span className="text-[10px] text-(--muted-2)">{suggestions.length} sugestoes</span>
      </div>

      <button
        type="button"
        onClick={runSuggestions}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded bg-(--text) px-3 py-2 text-[11px] font-semibold text-(--surface) disabled:opacity-50"
      >
        {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Gerando sugestoes..." : "IA: sugerir links internos"}
      </button>

      {suggestions.length > 0 ? (
        <button
          type="button"
          onClick={buildAutoPlan}
          disabled={loading || autoApplying}
          className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-[11px] font-semibold text-(--text) disabled:opacity-50"
        >
          Modo automatico (com confirmacao)
        </button>
      ) : null}

      {source ? <p className="text-[10px] text-(--muted-2)">Fonte: {source}</p> : null}

      {error ? <div className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">{error}</div> : null}

      {autoPlan ? (
        <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-2">
          <div className="text-[11px] font-semibold uppercase text-amber-800">Previa do plano automatico</div>
          {autoPlan.length === 0 ? (
            <p className="text-[10px] text-amber-700">Nao ha candidatos novos para aplicar automaticamente.</p>
          ) : (
            autoPlan.map((item) => (
              <div key={item.suggestion.postId} className="rounded border border-amber-200 bg-white p-2 text-[10px]">
                <div className="font-semibold text-(--text)">{item.suggestion.title}</div>
                <div className="text-(--muted)">Ancora: {item.suggestion.anchorText}</div>
                <div className="text-(--muted)">Status: {item.status}</div>
                <div className="text-(--muted-2)">{item.note}</div>
              </div>
            ))
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyAutoPlan}
              disabled={autoApplying || autoPlan.length === 0}
              className="flex-1 rounded-md bg-amber-700 px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
            >
              {autoApplying ? "Aplicando..." : "Confirmar aplicacao"}
            </button>
            <button
              type="button"
              onClick={cancelAutoPlan}
              disabled={autoApplying}
              className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-amber-700 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          {autoSummary ? (
            <div className="rounded border border-amber-200 bg-white p-2 text-[10px] text-amber-800">
              Aplicados: {autoSummary.applied} | Pulados: {autoSummary.skipped}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-(--muted-2)" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filtrar sugestoes..."
          className="w-full rounded-md border border-(--border) bg-(--surface) py-1.5 pl-7 pr-2 text-[11px] text-(--text) outline-none placeholder:text-(--muted-2)"
        />
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto">
        {!loading && filtered.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-(--muted-2)">
            Gere sugestoes para ver links priorizados por hierarquia e semantica.
          </p>
        ) : null}

        {filtered.map((suggestion) => (
          <div key={suggestion.postId} className="space-y-2 rounded border border-(--border) bg-(--surface) p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-(--text)">{suggestion.title}</div>
                <div className="truncate text-[9px] text-(--muted-2)">{suggestion.url}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`text-[11px] font-bold ${scoreTone(suggestion.score)}`}>{suggestion.score.toFixed(0)}%</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${roleBadge(suggestion.role)}`}>
                  {roleLabel(suggestion.role)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[9px] text-(--muted)">
              <span>Semantica: {suggestion.semanticScore.toFixed(0)}%</span>
              <span>Hierarquia: {suggestion.hierarchyScore.toFixed(0)}</span>
              {suggestion.position ? <span>Pos: {suggestion.position}</span> : null}
              {suggestion.alreadyLinked ? <span className="text-amber-700">Ja linkado</span> : null}
            </div>

            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--text)">
              <div>
                <strong>Ancora sugerida:</strong> {suggestion.anchorText}
              </div>
              <div className="mt-1 text-(--muted)">{suggestion.reason}</div>
            </div>

            <button
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className="w-full rounded-md bg-(--text) px-2 py-1.5 text-[10px] font-semibold text-(--surface) hover:opacity-80"
            >
              Aplicar link interno
            </button>
          </div>
        ))}
      </div>

      <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
        Dica: selecione um trecho antes de aplicar para manter a leitura mais natural. Sem selecao, a ancora sugerida e inserida no cursor.
      </div>
    </section>
  );
}
