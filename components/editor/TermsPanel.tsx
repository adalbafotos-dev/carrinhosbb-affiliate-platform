"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorContext } from "@/components/editor/EditorContext";

type TermStatus = "not_used" | "consider_using_more" | "in_suggested_range" | "slightly_above_range" | "consider_using_less";

type EntitySuggestion = {
  term: string;
  reason: string;
  confidence: number;
  suggestedLinkType: "about" | "mention";
  aboutUrl: string | null;
  mentionPost: { id: string; title: string; url: string } | null;
};

type SemanticDiagnostics = {
  semantic?: {
    lsiCoverageScore?: number;
    missingRelatedTerms?: string[];
    repeatedTerms?: Array<{ term: string; count: number }>;
    topSemanticTerms?: string[];
  };
  structure?: {
    coverageScore?: number;
    missingSections?: string[];
  };
  warnings?: string[];
};

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseTerm(raw: string): { term: string; min: number; max: number } | null {
  const parts = raw.split("|").map((part) => part.trim());
  if (parts.length === 1) return { term: parts[0], min: 1, max: 5 };
  if (parts.length === 3) {
    const term = parts[0];
    const min = Number.parseInt(parts[1], 10);
    const max = Number.parseInt(parts[2], 10);
    if (term && Number.isFinite(min) && Number.isFinite(max)) return { term, min, max };
  }
  if (parts.length === 2 && parts[1].includes("-")) {
    const term = parts[0];
    const [minStr, maxStr] = parts[1].split("-").map((part) => part.trim());
    const min = Number.parseInt(minStr, 10);
    const max = Number.parseInt(maxStr, 10);
    if (term && Number.isFinite(min) && Number.isFinite(max)) return { term, min, max };
  }
  return null;
}

function countOccurrences(text: string, term: string) {
  if (!term) return 0;
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return 0;
  return normalizedText.split(normalizedTerm).length - 1;
}

function getTermStatus(count: number, min: number, max: number): TermStatus {
  if (count === 0) return "not_used";
  if (count < min) return "consider_using_more";
  if (count >= min && count <= max) return "in_suggested_range";
  if (count > max && count <= max * 1.2) return "slightly_above_range";
  return "consider_using_less";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
    if (index >= 0) {
      found = { from: pos + index, to: pos + index + term.length };
    }
    return true;
  });
  return found;
}

export function TermsPanel() {
  const { docText, meta, editor, setMeta, postId } = useEditorContext();
  const [filter, setFilter] = useState<TermStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<EntitySuggestion[]>([]);
  const [aiDiagnostics, setAiDiagnostics] = useState<SemanticDiagnostics | null>(null);

  const termsData = useMemo(() => {
    const parsed: Array<{ term: string; min: number; max: number; count: number; status: TermStatus }> = [];

    for (const raw of meta.supportingKeywords) {
      const result = parseTerm(raw);
      if (!result) continue;
      const count = countOccurrences(docText, result.term);
      parsed.push({ ...result, count, status: getTermStatus(count, result.min, result.max) });
    }

    for (const entity of meta.entities) {
      if (parsed.some((entry) => normalize(entry.term) === normalize(entity))) continue;
      const count = countOccurrences(docText, entity);
      parsed.push({ term: entity, min: 1, max: 5, count, status: getTermStatus(count, 1, 5) });
    }

    return parsed;
  }, [docText, meta.entities, meta.supportingKeywords]);

  const filteredTerms = useMemo(
    () =>
      termsData.filter((entry) => {
        const matchesFilter = filter === "all" || entry.status === filter;
        const matchesSearch = !search || normalize(entry.term).includes(normalize(search));
        return matchesFilter && matchesSearch;
      }),
    [filter, search, termsData]
  );

  const handleCopyList = () => {
    const csv = `term,count,min,max,status\n${termsData
      .map((item) => `${item.term},${item.count},${item.min},${item.max},${item.status}`)
      .join("\n")}`;
    navigator.clipboard.writeText(csv);
  };

  const handleInsertTerm = (term: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`${term} `).run();
  };

  const addEntityToMeta = (term: string) => {
    if (meta.entities.some((item) => normalize(item) === normalize(term))) return;
    setMeta({ entities: [...meta.entities, term] });
  };

  const applySemanticLink = (suggestion: EntitySuggestion, mode: "about" | "mention") => {
    if (!editor) return;
    const href = mode === "about" ? suggestion.aboutUrl : suggestion.mentionPost?.url;
    if (!href) return;

    const attrs = {
      href,
      target: mode === "about" ? "_blank" : null,
      rel: mode === "about" ? "about noopener noreferrer" : "mention",
      "data-link-type": mode,
      "data-post-id": mode === "mention" ? suggestion.mentionPost?.id ?? null : null,
      "data-entity-type": mode,
      "data-entity": mode,
    };

    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().setLink(attrs).run();
      return;
    }

    const range = findFirstUnlinkedTermRange(editor, suggestion.term);
    if (range) {
      editor.chain().focus().setTextSelection(range).setLink(attrs).run();
      return;
    }

    const html = `<a href="${escapeAttr(attrs.href)}"${
      attrs.target ? ` target="${attrs.target}"` : ""
    }${attrs.rel ? ` rel="${escapeAttr(attrs.rel)}"` : ""} data-link-type="${attrs["data-link-type"]}"${
      attrs["data-post-id"] ? ` data-post-id="${attrs["data-post-id"]}"` : ""
    } data-entity-type="${attrs["data-entity-type"]}" data-entity="${attrs["data-entity"]}">${escapeHtml(
      suggestion.term
    )}</a> `;
    editor.chain().focus().insertContent(html).run();
  };

  const runAISuggestions = async () => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text || text.split(/\s+/).filter(Boolean).length < 80) {
      setAiError("Escreva pelo menos 80 palavras para gerar sugestoes.");
      setAiSuggestions([]);
      setAiDiagnostics(null);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/admin/entity-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meta.title,
          keyword: meta.targetKeyword,
          postId,
          text,
          existingEntities: meta.entities,
          supportingKeywords: meta.supportingKeywords,
          maxSuggestions: 8,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setAiError(json?.message || json?.error || "Falha ao gerar sugestoes.");
        setAiSuggestions([]);
        setAiDiagnostics(null);
        return;
      }

      const suggestions = Array.isArray(json?.suggestions) ? (json.suggestions as EntitySuggestion[]) : [];
      setAiSuggestions(suggestions);
      setAiDiagnostics((json?.diagnostics as SemanticDiagnostics) ?? null);
    } catch (error: any) {
      setAiError(error?.message || "Falha ao gerar sugestoes.");
      setAiSuggestions([]);
      setAiDiagnostics(null);
    } finally {
      setAiLoading(false);
    }
  };

  const statusColors: Record<TermStatus, string> = {
    not_used: "border-2 border-red-600 bg-red-600 text-white font-semibold shadow-md",
    consider_using_more: "border-2 border-orange-600 bg-orange-600 text-white font-semibold shadow-md",
    in_suggested_range: "border-2 border-emerald-600 bg-emerald-600 text-white font-semibold shadow-md",
    slightly_above_range: "border-2 border-yellow-600 bg-yellow-600 text-white font-semibold shadow-md",
    consider_using_less: "border-2 border-red-700 bg-red-700 text-white font-semibold shadow-md",
  };

  return (
    <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center justify-between text-sm font-semibold uppercase text-(--text)">
        <span>Termos / LSI</span>
        <button
          onClick={handleCopyList}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Copy
        </button>
      </div>

      <button
        type="button"
        onClick={runAISuggestions}
        disabled={aiLoading}
        className="w-full rounded-md bg-(--text) px-3 py-2 text-[11px] font-semibold text-(--surface) disabled:opacity-50"
      >
        {aiLoading ? "IA analisando entidades..." : "IA: sugerir entidades e links"}
      </button>

      {aiError ? <div className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">{aiError}</div> : null}

      {aiDiagnostics ? (
        <div className="space-y-1 rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
          <div className="font-semibold uppercase text-(--text)">Diagnostico LSI/PNL</div>
          <div>
            Cobertura LSI: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics.semantic?.lsiCoverageScore ?? 0)}%</span>
          </div>
          <div>
            Estrutura PNL: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics.structure?.coverageScore ?? 0)}%</span>
          </div>
          {(aiDiagnostics.semantic?.missingRelatedTerms?.length ?? 0) > 0 ? (
            <div className="line-clamp-2">
              Falta cobrir: {aiDiagnostics.semantic?.missingRelatedTerms?.slice(0, 4).join(", ")}
            </div>
          ) : null}
          {(aiDiagnostics.warnings?.length ?? 0) > 0 ? (
            <div className="text-amber-700">{aiDiagnostics.warnings?.slice(0, 2).join(" ")}</div>
          ) : null}
        </div>
      ) : null}

      {aiSuggestions.length > 0 ? (
        <div className="space-y-2 rounded border border-(--border) bg-(--surface) p-2">
          <div className="text-[11px] font-semibold uppercase text-(--muted)">Sugestoes de entidades</div>
          {aiSuggestions.map((suggestion, index) => (
            <div key={`${suggestion.term}-${index}`} className="rounded border border-(--border) bg-(--surface-muted) p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[12px] font-semibold text-(--text)">{suggestion.term}</div>
                <span className="rounded bg-(--surface) px-2 py-0.5 text-[10px] font-semibold text-(--muted)">
                  {(suggestion.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-(--muted)">{suggestion.reason}</p>

              {suggestion.mentionPost ? (
                <p className="mt-1 truncate text-[10px] text-blue-700">Mention sugerido: {suggestion.mentionPost.title}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addEntityToMeta(suggestion.term)}
                  className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text)"
                >
                  + Entidade
                </button>

                {suggestion.aboutUrl ? (
                  <button
                    type="button"
                    onClick={() => applySemanticLink(suggestion, "about")}
                    className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700"
                  >
                    Link About
                  </button>
                ) : null}

                {suggestion.mentionPost ? (
                  <button
                    type="button"
                    onClick={() => applySemanticLink(suggestion, "mention")}
                    className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"
                  >
                    Link Mention
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar termo..."
          className="w-full rounded-md border-2 border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text) outline-none placeholder:text-(--muted-2) focus:border-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            filter === "all" ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter("not_used")}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            filter === "not_used" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          Nao usado
        </button>
        <button
          onClick={() => setFilter("consider_using_more")}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            filter === "consider_using_more"
              ? "bg-orange-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          Usar mais
        </button>
        <button
          onClick={() => setFilter("in_suggested_range")}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            filter === "in_suggested_range"
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          Na faixa
        </button>
        <button
          onClick={() => setFilter("slightly_above_range")}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            filter === "slightly_above_range"
              ? "bg-yellow-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          Acima
        </button>
        <button
          onClick={() => setFilter("consider_using_less")}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            filter === "consider_using_less"
              ? "bg-red-700 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          Usar menos
        </button>
      </div>

      <div className="rounded border border-(--border-strong) bg-white p-2 text-xs text-slate-700">
        Termos (formato:{" "}
        <code className="rounded border border-slate-300 !bg-slate-100 px-1 py-0.5 text-[10px] font-semibold !text-slate-900">
          termo|min|max
        </code>{" "}
        ou{" "}
        <code className="rounded border border-slate-300 !bg-slate-100 px-1 py-0.5 text-[10px] font-semibold !text-slate-900">
          termo|min-max
        </code>
        )
      </div>

      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {filteredTerms.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--muted-2)">{search ? "Nenhum termo encontrado na busca." : "Nenhum termo definido."}</p>
        ) : null}

        {filteredTerms.map((termData, index) => (
          <div key={`${termData.term}-${index}`} className={`flex items-center justify-between gap-2 rounded-lg p-3 ${statusColors[termData.status]}`}>
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-base font-bold">{termData.term}</div>
              <div className="mt-1 text-xs opacity-90">
                <span className="font-mono">{termData.count}x</span> (faixa: {termData.min}-{termData.max})
              </div>
            </div>
            <button
              onClick={() => handleInsertTerm(termData.term)}
              className="h-8 w-8 shrink-0 rounded-md bg-white/20 text-lg font-bold backdrop-blur-sm transition-colors hover:bg-white/30"
              title="Inserir termo no cursor"
            >
              +
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
