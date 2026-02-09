"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";

type CopyRiskLevel = "low" | "medium" | "high";

type ExternalCopyMatch = {
  query: string;
  queryExcerpt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceSnippet: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: CopyRiskLevel;
};

type ExternalCopyAnalysis = {
  uniquenessScore: number;
  riskLevel: CopyRiskLevel;
  totalWords: number;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  summary: string;
  matches: ExternalCopyMatch[];
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function badgeTone(level: CopyRiskLevel) {
  if (level === "high") return "border-red-200 bg-red-50 text-red-700";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function PlagiarismInspectorPanel() {
  const { editor, meta, docText } = useEditorContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ExternalCopyAnalysis | null>(null);

  const wordCount = useMemo(() => {
    const text = (editor?.getText() ?? docText ?? "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [docText, editor]);

  const runInspection = async () => {
    const text = (editor?.getText() ?? docText ?? "").trim();
    if (!text || text.split(/\s+/).filter(Boolean).length < 80) {
      setError("Escreva pelo menos 80 palavras para rodar o inspetor.");
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/seo/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          title: meta.title,
          keyword: meta.targetKeyword,
          maxQueries: 6,
          num: 5,
          hl: "pt-BR",
          gl: "BR",
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.message || json?.error || "Falha ao inspecionar copias.");
        setAnalysis(null);
        return;
      }

      setAnalysis(json.analysis as ExternalCopyAnalysis);
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao inspecionar copias.");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-2">
          {analysis && analysis.uniquenessScore >= 80 ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          Inspetor de Copias (Web)
        </span>
        <span className="text-[10px] text-(--muted-2)">{wordCount} palavras</span>
      </div>

      <button
        type="button"
        onClick={runInspection}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded bg-(--text) px-3 py-2 text-[11px] font-semibold text-(--surface) transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <Search size={14} />
        {loading ? "Inspecionando..." : "Buscar sinais de copia"}
      </button>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">
          {error}
        </div>
      ) : null}

      {analysis ? (
        <div className="space-y-3 rounded border border-(--border) bg-(--surface) p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase text-(--muted)">Unicidade estimada</div>
              <div className={`text-xl font-bold ${scoreTone(analysis.uniquenessScore)}`}>{analysis.uniquenessScore}%</div>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeTone(analysis.riskLevel)}`}>
              {analysis.riskLevel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
              <div className="font-semibold text-(--text)">{analysis.checkedChunks}</div>
              <div className="text-(--muted)">trechos</div>
            </div>
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
              <div className="font-semibold text-amber-700">{analysis.suspectChunks}</div>
              <div className="text-(--muted)">suspeitos</div>
            </div>
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
              <div className="font-semibold text-red-700">{analysis.highRiskChunks}</div>
              <div className="text-(--muted)">alto risco</div>
            </div>
          </div>

          <p className="text-[11px] text-(--muted)">{analysis.summary}</p>

          {analysis.matches.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase text-(--muted)">Possiveis fontes</div>
              {analysis.matches.slice(0, 5).map((match, index) => (
                <div key={`${match.sourceUrl}-${index}`} className="rounded border border-(--border) bg-(--surface-muted) p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${badgeTone(match.riskLevel)}`}>
                      {(match.similarityScore * 100).toFixed(0)}%
                    </span>
                    <span className="truncate text-[10px] text-(--muted)">{match.sourceDomain}</span>
                  </div>

                  <a
                    href={match.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-blue-600 hover:underline"
                    title={match.sourceTitle}
                  >
                    {match.sourceTitle || "Abrir fonte"}
                    <ExternalLink size={10} />
                  </a>
                  {match.sourceSnippet ? (
                    <p className="mt-1 line-clamp-2 text-[10px] text-(--muted)">{match.sourceSnippet}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-700">
              <ShieldCheck size={12} />
              Nenhum indicio forte de copia nos trechos analisados.
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
        <div className="flex items-center gap-1 font-semibold uppercase">
          <AlertTriangle size={11} />
          Observacao
        </div>
        <p className="mt-1">
          A analise e heuristica por SERP/snippets e nao substitui revisao editorial humana.
        </p>
      </div>
    </section>
  );
}
