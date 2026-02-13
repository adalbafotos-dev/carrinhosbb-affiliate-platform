"use client";

import { useState } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { useContentGuardian } from "@/hooks/useContentGuardian";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

export function GuardianPanel() {
    const { editor, meta, links } = useEditorContext();
    const { issues, metrics } = useContentGuardian(editor, meta, links);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<any | null>(null);
    const [aiDiagnostics, setAiDiagnostics] = useState<any | null>(null);

    const criticalIssues = issues.filter((i) => i.level === "critical");
    const warnIssues = issues.filter((i) => i.level === "warn");

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-500";
        if (score >= 70) return "text-amber-500";
        return "text-red-500";
    };

    const runAiAssist = async () => {
        if (!editor) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch("/api/admin/guardian-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: meta.title,
                    metaDescription: meta.metaDescription,
                    keyword: meta.targetKeyword,
                    issues: issues.map((i) => i.message),
                    text: editor.getText(),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data?.ok) {
                setAiError(data?.error || "Falha ao consultar a IA.");
                setAiResult(null);
                setAiDiagnostics(null);
            } else {
                setAiResult(data?.result ?? data);
                setAiDiagnostics(data?.diagnostics ?? null);
            }
        } catch (error: any) {
            setAiError(error?.message || "Falha ao consultar a IA.");
            setAiResult(null);
            setAiDiagnostics(null);
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {metrics.score >= 90 ? (
                        <ShieldCheck size={18} className="text-emerald-500" />
                    ) : (
                        <ShieldAlert size={18} className={metrics.score >= 70 ? "text-amber-500" : "text-red-500"} />
                    )}
                    <span className="text-xs font-semibold uppercase text-(--muted)">Guardião SEO</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(metrics.score)}`}>{metrics.score}%</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-(--muted-foreground)">
                <div className="flex flex-col rounded bg-(--surface) p-2 text-center border border-(--border)">
                    <span className="font-bold text-(--text)">{metrics.wordCount}</span>
                    <span>Palavras</span>
                </div>
                <div className="flex flex-col rounded bg-(--surface) p-2 text-center border border-(--border)">
                    <span className={`font-bold ${metrics.keywordDensity > 2.5 ? "text-red-500" : "text-(--text)"}`}>
                        {metrics.keywordDensity.toFixed(1)}%
                    </span>
                    <span>Densidade</span>
                </div>
            </div>

            {issues.length > 0 ? (
                <div className="space-y-1 pt-2">
                    {criticalIssues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 rounded-lg bg-red-600 p-3 text-sm font-semibold text-white shadow-md">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{issue.message}</span>
                        </div>
                    ))}
                    {warnIssues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 rounded-lg bg-amber-600 p-3 text-sm font-semibold text-white shadow-md">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>{issue.message}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-600 p-3 text-sm font-semibold text-white shadow-md">
                    <CheckCircle2 size={16} />
                    <span>Tudo certo com o SEO!</span>
                </div>
            )}

            <div className="pt-2">
                <button
                    type="button"
                    onClick={runAiAssist}
                    disabled={aiLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-xs font-semibold text-(--text) hover:bg-(--surface-muted) disabled:opacity-60"
                >
                    <Sparkles size={14} />
                    {aiLoading ? "Analisando com IA..." : "IA: Ajustes sugeridos"}
                </button>
                {aiError ? (
                    <p className="mt-2 text-[11px] text-red-500">{aiError}</p>
                ) : null}
                {aiResult ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-(--border) bg-(--surface) p-3 text-[11px] text-(--text)">
                        {aiDiagnostics ? (
                            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
                                <p className="font-semibold uppercase text-(--text)">Diagnostico LSI/PNL</p>
                                <p className="mt-1">
                                    Cobertura LSI: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics?.coverage?.lsiCoverageScore ?? 0)}%</span>
                                </p>
                                <p>
                                    Estrutura PNL: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics?.structure?.coverageScore ?? 0)}%</span>
                                </p>
                                {Array.isArray(aiDiagnostics?.structure?.missingSections) && aiDiagnostics.structure.missingSections.length ? (
                                    <p>Faltando: {aiDiagnostics.structure.missingSections.slice(0, 4).join(", ")}</p>
                                ) : null}
                            </div>
                        ) : null}
                        {aiResult.analysis ? (
                            <div>
                                <p className="font-semibold uppercase text-(--muted)">Resumo</p>
                                <p className="mt-1 text-(--muted)">{aiResult.analysis}</p>
                            </div>
                        ) : null}
                        {Array.isArray(aiResult.quick_fixes) && aiResult.quick_fixes.length ? (
                            <div>
                                <p className="font-semibold uppercase text-(--muted)">Ajustes rápidos</p>
                                <ul className="mt-1 list-disc pl-4 text-(--muted)">
                                    {aiResult.quick_fixes.map((item: string, idx: number) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {aiResult.suggested_meta_description ? (
                            <div>
                                <p className="font-semibold uppercase text-(--muted)">Meta description sugerida</p>
                                <p className="mt-1 text-(--muted)">{aiResult.suggested_meta_description}</p>
                            </div>
                        ) : null}
                        {aiResult.suggested_first_paragraph ? (
                            <div>
                                <p className="font-semibold uppercase text-(--muted)">Primeiro parágrafo sugerido</p>
                                <p className="mt-1 text-(--muted)">{aiResult.suggested_first_paragraph}</p>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
