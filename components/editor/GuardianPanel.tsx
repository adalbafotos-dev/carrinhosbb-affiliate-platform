"use client";

import { useEditorContext } from "@/components/editor/EditorContext";
import { useContentGuardian } from "@/hooks/useContentGuardian";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck, ShieldAlert } from "lucide-react";

export function GuardianPanel() {
    const { editor, meta, links } = useEditorContext();
    const { issues, metrics } = useContentGuardian(editor, meta, links);

    const criticalIssues = issues.filter((i) => i.level === "critical");
    const warnIssues = issues.filter((i) => i.level === "warn");

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-500";
        if (score >= 70) return "text-amber-500";
        return "text-red-500";
    };

    return (
        <section className="space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {metrics.score >= 90 ? (
                        <ShieldCheck size={18} className="text-emerald-500" />
                    ) : (
                        <ShieldAlert size={18} className={metrics.score >= 70 ? "text-amber-500" : "text-red-500"} />
                    )}
                    <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Guardião SEO</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(metrics.score)}`}>{metrics.score}%</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-[color:var(--muted-foreground)]">
                <div className="flex flex-col rounded bg-[color:var(--surface)] p-2 text-center border border-[color:var(--border)]">
                    <span className="font-bold text-[color:var(--text)]">{metrics.wordCount}</span>
                    <span>Palavras</span>
                </div>
                <div className="flex flex-col rounded bg-[color:var(--surface)] p-2 text-center border border-[color:var(--border)]">
                    <span className={`font-bold ${metrics.keywordDensity > 2.5 ? "text-red-500" : "text-[color:var(--text)]"}`}>
                        {metrics.keywordDensity.toFixed(1)}%
                    </span>
                    <span>Densidade</span>
                </div>
            </div>

            {issues.length > 0 ? (
                <div className="space-y-1 pt-2">
                    {criticalIssues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 rounded bg-red-100 p-2 text-[11px] font-medium text-red-900 dark:bg-red-900/40 dark:text-red-100">
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-700 dark:text-red-400" />
                            <span>{issue.message}</span>
                        </div>
                    ))}
                    {warnIssues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 rounded bg-amber-100 p-2 text-[11px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
                            <span>{issue.message}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded bg-emerald-100 p-2 text-[11px] font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                    <CheckCircle2 size={14} className="text-emerald-700 dark:text-emerald-400" />
                    <span>Tudo certo com o SEO!</span>
                </div>
            )}
        </section>
    );
}
