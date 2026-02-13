"use client";

import { useMemo, useState } from "react";
import { Link2, RefreshCcw, Search, Sparkles } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { Editor } from "@tiptap/react";

type LinkSuggestion = {
  candidateId: string;
  postId: string;
  title: string;
  url: string;
  slug: string;
  anchorBucket: "START" | "MID" | "END";
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

type LinkSuggestionDiagnostics = {
  semantic?: {
    lsiCoverageScore?: number;
    missingRelatedTerms?: string[];
  };
  structure?: {
    coverageScore?: number;
    missingSections?: string[];
  };
  warnings?: string[];
};

function roleBadge(role: LinkSuggestion["role"]) {
  if (role === "PILLAR") return "bg-amber-100 text-amber-700";
  if (role === "SUPPORT") return "bg-blue-100 text-blue-700";
  if (role === "AUX") return "bg-slate-100 text-slate-700";
  return "bg-gray-100 text-gray-700";
}

function roleLabel(role: LinkSuggestion["role"], position: number | null) {
  if (role === "PILLAR") return "Pilar";
  if (role === "SUPPORT") return typeof position === "number" ? `Suporte ${position}` : "Suporte";
  if (role === "AUX") return typeof position === "number" ? `Aux ${position}` : "Aux";
  return "Sem papel";
}

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-700";
  if (score >= 55) return "text-amber-700";
  return "text-red-700";
}

function bucketLabel(bucket: LinkSuggestion["anchorBucket"]) {
  if (bucket === "START") return "Topo";
  if (bucket === "MID") return "Meio";
  return "Final";
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findUnlinkedTermRanges(editor: Editor, term: string) {
  const needle = normalizeComparable(term.trim());
  if (!needle) return [];

  const ranges: Array<{ from: number; to: number }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    if (node.marks.some((mark) => mark.type.name === "link")) return true;

    const text = String(node.text ?? "");
    const haystack = normalizeComparable(text);
    if (!haystack) return true;

    let cursor = 0;
    while (cursor < haystack.length) {
      const index = haystack.indexOf(needle, cursor);
      if (index < 0) break;
      ranges.push({ from: pos + index, to: pos + index + needle.length });
      cursor = index + Math.max(needle.length, 1);
    }
    return true;
  });

  return ranges;
}

function findFirstUnlinkedTermRange(editor: Editor, term: string) {
  const ranges = findUnlinkedTermRanges(editor, term);
  return ranges[0] ?? null;
}

function isSelectionCompatibleWithAnchor(editor: Editor, anchor: string) {
  const { from, to } = editor.state.selection;
  if (from === to) return false;
  const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
  const normalizedSelection = normalizeComparable(selectedText);
  const normalizedAnchor = normalizeComparable(anchor);
  if (!normalizedSelection || !normalizedAnchor) return false;
  if (normalizedSelection === normalizedAnchor) return true;
  if (normalizedSelection.includes(normalizedAnchor)) return true;
  if (normalizedAnchor.includes(normalizedSelection) && normalizedSelection.split(" ").length >= 2) return true;
  return false;
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
  const [diagnostics, setDiagnostics] = useState<LinkSuggestionDiagnostics | null>(null);
  const [pendingApplyCandidateId, setPendingApplyCandidateId] = useState<string | null>(null);
  const [previewCursorByCandidate, setPreviewCursorByCandidate] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suggestions;
    return suggestions.filter((item) => item.title.toLowerCase().includes(term) || item.anchorText.toLowerCase().includes(term));
  }, [search, suggestions]);

  const occurrenceCountByCandidate = useMemo(() => {
    if (!editor) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    suggestions.forEach((suggestion) => {
      map[suggestion.candidateId] = findUnlinkedTermRanges(editor, suggestion.anchorText).length;
    });
    return map;
  }, [editor, suggestions, docText]);

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
          maxSuggestions: 20,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.message || json?.error || "Falha ao gerar links internos.");
        setSuggestions([]);
        setSource("");
        setAutoPlan(null);
        setAutoSummary(null);
        setDiagnostics(null);
        setPendingApplyCandidateId(null);
        setPreviewCursorByCandidate({});
        return;
      }

      const rawSuggestions = Array.isArray(json?.suggestions) ? (json.suggestions as Partial<LinkSuggestion>[]) : [];
      const nextSuggestions: LinkSuggestion[] = rawSuggestions
        .filter((item): item is Partial<LinkSuggestion> & { postId: string; title: string; url: string; slug: string; anchorText: string } =>
          Boolean(item && item.postId && item.title && item.url && item.slug && item.anchorText)
        )
        .map((item, index) => ({
          candidateId: item.candidateId || `${item.postId}::${item.anchorText.toLowerCase()}::${index}`,
          postId: item.postId,
          title: item.title,
          url: item.url,
          slug: item.slug,
          anchorBucket: item.anchorBucket ?? "MID",
          role: item.role ?? null,
          position: typeof item.position === "number" ? item.position : null,
          score: typeof item.score === "number" ? item.score : 0,
          semanticScore: typeof item.semanticScore === "number" ? item.semanticScore : 0,
          hierarchyScore: typeof item.hierarchyScore === "number" ? item.hierarchyScore : 0,
          anchorText: item.anchorText,
          reason: typeof item.reason === "string" ? item.reason : "",
          source: (item.source === "ai" ? "ai" : "heuristic") as "ai" | "heuristic",
          alreadyLinked: Boolean(item.alreadyLinked),
        }))
        .filter((item) => !item.alreadyLinked && item.score >= 4);
      setSuggestions(nextSuggestions);
      setSource(String(json?.source || ""));
      setDiagnostics((json?.diagnostics as LinkSuggestionDiagnostics) ?? null);
      if (nextSuggestions.length === 0 && json?.message) {
        setError(String(json.message));
      }
      setAutoPlan(null);
      setAutoSummary(null);
      setPendingApplyCandidateId(null);
      setPreviewCursorByCandidate({});
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao gerar links internos.");
      setSuggestions([]);
      setSource("");
      setAutoPlan(null);
      setAutoSummary(null);
      setDiagnostics(null);
      setPendingApplyCandidateId(null);
      setPreviewCursorByCandidate({});
    } finally {
      setLoading(false);
    }
  };

  const previewSuggestionAnchor = (suggestion: LinkSuggestion) => {
    if (!editor) return;
    const ranges = findUnlinkedTermRanges(editor, suggestion.anchorText);
    if (!ranges.length) {
      setError("Nao encontrei esta ancora em texto livre para revisar contexto.");
      return;
    }
    const cursor = previewCursorByCandidate[suggestion.candidateId] ?? 0;
    const targetIndex = ranges.length ? cursor % ranges.length : 0;
    const range = ranges[targetIndex];
    if (!range) return;

    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
    setPendingApplyCandidateId(suggestion.candidateId);
    setPreviewCursorByCandidate((prev) => ({
      ...prev,
      [suggestion.candidateId]: targetIndex + 1,
    }));
    setError(null);
  };

  const applySuggestion = (suggestion: LinkSuggestion) => {
    if (!editor) return;
    setError(null);
    const attrs = {
      href: suggestion.url,
      target: null,
      rel: null,
      "data-link-type": "internal",
      "data-post-id": suggestion.postId,
    } as any;

    const anchor = suggestion.anchorText?.trim();
    if (!anchor) {
      setError("Sugestao sem ancora natural disponivel para aplicacao.");
      return;
    }

    const naturalRange = findFirstUnlinkedTermRange(editor, anchor);
    if (naturalRange) {
      const { from, to } = editor.state.selection;
      const sameRange = from === naturalRange.from && to === naturalRange.to;
      if (!sameRange || pendingApplyCandidateId !== suggestion.candidateId) {
        editor.chain().focus().setTextSelection(naturalRange).scrollIntoView().run();
        setPendingApplyCandidateId(suggestion.candidateId);
        setError("Contexto localizado. Revise a frase e clique novamente para confirmar o link.");
        return;
      }

      editor.chain().focus().setTextSelection(naturalRange).setLink(attrs).run();
      setPendingApplyCandidateId(null);
      return;
    }

    if (isSelectionCompatibleWithAnchor(editor, anchor)) {
      editor.chain().focus().setLink(attrs).run();
      setPendingApplyCandidateId(null);
      return;
    }

    setError(
      "Nao encontrei ocorrencia natural da ancora sugerida. Selecione exatamente essa ancora (ou trecho equivalente) e tente novamente."
    );
  };

  const buildAutoPlan = () => {
    const prioritized = suggestions
      .filter((item) => !item.alreadyLinked)
      .sort((a, b) => b.score - a.score);
    const uniqueTargets = new Set(prioritized.map((item) => item.postId)).size;
    const planLimit = Math.min(6, Math.max(3, uniqueTargets));

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

    (["START", "MID", "END"] as LinkSuggestion["anchorBucket"][]).forEach((bucket) => {
      addIfUnique(prioritized.find((item) => item.anchorBucket === bucket));
    });
    prioritized.forEach((item) => {
      if (chosen.length >= planLimit) return;
      addIfUnique(item);
    });

    setAutoPlan(
      chosen.slice(0, planLimit).map((suggestion) => ({
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
      const anchorCandidates = [suggestion.anchorText].filter(Boolean);

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
    setPendingApplyCandidateId(null);
    setAutoApplying(false);
  };

  const cancelAutoPlan = () => {
    setAutoPlan(null);
    setAutoSummary(null);
    setPendingApplyCandidateId(null);
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

      {diagnostics ? (
        <div className="space-y-1 rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
          <div className="font-semibold uppercase text-(--text)">Diagnostico LSI/PNL</div>
          <div>
            Cobertura LSI:{" "}
            <span className="font-semibold text-(--text)">{Math.round(diagnostics.semantic?.lsiCoverageScore ?? 0)}%</span>
          </div>
          <div>
            Estrutura PNL:{" "}
            <span className="font-semibold text-(--text)">{Math.round(diagnostics.structure?.coverageScore ?? 0)}%</span>
          </div>
          {(diagnostics.semantic?.missingRelatedTerms?.length ?? 0) > 0 ? (
            <div className="line-clamp-2">
              Termos faltando no texto: {diagnostics.semantic?.missingRelatedTerms?.slice(0, 4).join(", ")}
            </div>
          ) : null}
          {(diagnostics.warnings?.length ?? 0) > 0 ? (
            <div className="text-amber-700">{diagnostics.warnings?.slice(0, 2).join(" ")}</div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">{error}</div> : null}

      {autoPlan ? (
        <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-2">
          <div className="text-[11px] font-semibold uppercase text-amber-800">Previa do plano automatico</div>
          {autoPlan.length === 0 ? (
            <p className="text-[10px] text-amber-700">Nao ha candidatos novos para aplicar automaticamente.</p>
          ) : (
            autoPlan.map((item) => (
              <div key={item.suggestion.candidateId} className="rounded border border-amber-200 bg-white p-2 text-[10px]">
                <div className="font-semibold text-(--text)">{item.suggestion.title}</div>
                <div className="text-(--muted)">Ancora: {item.suggestion.anchorText}</div>
                <div className="text-(--muted)">Posicao: {bucketLabel(item.suggestion.anchorBucket)}</div>
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
          <div key={suggestion.candidateId} className="space-y-2 rounded border border-(--border) bg-(--surface) p-2">
            {(() => {
              const occurrenceCount = occurrenceCountByCandidate[suggestion.candidateId] ?? 0;
              return (
                <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-(--text)">{suggestion.title}</div>
                <div className="truncate text-[9px] text-(--muted-2)">{suggestion.url}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`text-[11px] font-bold ${scoreTone(suggestion.score)}`}>{suggestion.score.toFixed(0)}%</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${roleBadge(suggestion.role)}`}>
                  {roleLabel(suggestion.role, suggestion.position)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[9px] text-(--muted)">
              <span>Semantica: {suggestion.semanticScore.toFixed(0)}%</span>
              <span>Hierarquia: {suggestion.hierarchyScore.toFixed(0)}</span>
              <span>Posicao do texto: {bucketLabel(suggestion.anchorBucket)}</span>
              <span>Ocorrencias: {occurrenceCount}</span>
              {suggestion.position ? <span>Pos: {suggestion.position}</span> : null}
              {suggestion.alreadyLinked ? <span className="text-amber-700">Ja linkado</span> : null}
            </div>

            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--text)">
              <div>
                <strong>Ancora sugerida:</strong> {suggestion.anchorText}
              </div>
              <div className="mt-1 text-(--muted)">{suggestion.reason}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => previewSuggestionAnchor(suggestion)}
                disabled={occurrenceCount <= 0}
                className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1.5 text-[10px] font-semibold text-(--text) disabled:opacity-40"
              >
                Ver frase ({occurrenceCount})
              </button>
              <button
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="rounded-md bg-(--text) px-2 py-1.5 text-[10px] font-semibold text-(--surface) hover:opacity-80"
              >
                {pendingApplyCandidateId === suggestion.candidateId ? "Confirmar link" : "Aplicar link interno"}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>

      <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
        Dica: clique em "Ver frase" para revisar o contexto. O botao "Aplicar" exige confirmacao na ancora localizada.
      </div>
    </section>
  );
}
