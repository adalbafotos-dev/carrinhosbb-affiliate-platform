"use client";

import { useMemo, useState } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { CheckCircle2, Circle, Filter } from "lucide-react";

type TermStatus = "unused" | "low" | "ok" | "high";

function normalize(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function countOccurrences(text: string, term: string) {
    if (!term) return 0;
    const normalizedText = normalize(text);
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return 0;
    // Simple check for now, can be improved with regex
    return normalizedText.split(normalizedTerm).length - 1;
}

export function TermsPanel() {
    const { docText, meta, setMeta } = useEditorContext();
    const [filter, setFilter] = useState<TermStatus | "all">("all");

    const wordCount = useMemo(() => {
        return docText.trim().split(/\s+/).filter(Boolean).length;
    }, [docText]);

    const target = Math.max(1, Math.min(8, Math.round(wordCount / 350)));
    const minRange = Math.max(1, target - 1);
    const maxRange = target + 1;

    const termsData = useMemo(() => {
        const list = Array.from(new Set([...meta.supportingKeywords, ...meta.entities].filter(Boolean)));
        return list.map((term) => {
            const count = countOccurrences(docText, term);
            let status: TermStatus = "unused";
            if (count === 0) status = "unused";
            else if (count < minRange) status = "low";
            else if (count > maxRange) status = "high";
            else status = "ok";

            return { term, count, status };
        });
    }, [docText, meta.entities, meta.supportingKeywords, minRange, maxRange]);

    const filteredTerms = termsData.filter(t => filter === "all" || t.status === filter);

    return (
        <section className="space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-[color:var(--muted)]">
                <span>Termos / LSI</span>
                <div className="flex bg-[color:var(--surface)] rounded border border-[color:var(--border)] p-0.5">
                    <button onClick={() => setFilter("all")} className={`px-1.5 py-0.5 text-[10px] rounded ${filter === "all" ? "bg-[color:var(--surface-muted)] font-bold text-[color:var(--text)]" : "text-[color:var(--muted-2)]"}`}>All</button>
                    <button onClick={() => setFilter("unused")} className={`px-1.5 py-0.5 text-[10px] rounded ${filter === "unused" ? "bg-red-100 text-red-700" : "text-[color:var(--muted-2)]"}`}>0</button>
                    <button onClick={() => setFilter("ok")} className={`px-1.5 py-0.5 text-[10px] rounded ${filter === "ok" ? "bg-emerald-100 text-emerald-700" : "text-[color:var(--muted-2)]"}`}>OK</button>
                </div>
            </div>

            <div className="space-y-2">
                <textarea
                    value={meta.supportingKeywords.join("\n")}
                    onChange={(event) =>
                        setMeta({ supportingKeywords: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })
                    }
                    className="h-16 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-[12px] text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted-2)] font-mono resize-none"
                    placeholder="Palavras-chave (LSI)..."
                />

                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto content-start">
                    {filteredTerms.length === 0 && (
                        <p className="text-[10px] text-[color:var(--muted-2)] w-full text-center py-2">Nenhum termo encontrado no filtro.</p>
                    )}
                    {filteredTerms.map((item) => (
                        <div
                            key={item.term}
                            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] ${item.status === "ok"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : item.status === "unused"
                                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                                        : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]"
                                }`}
                        >
                            <span className="max-w-[100px] truncate" title={item.term}>{item.term}</span>
                            <span className="font-mono text-[9px] opacity-70">
                                {item.count}/{target}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
