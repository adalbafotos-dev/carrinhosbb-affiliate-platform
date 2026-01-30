"use client";

import { useState, useMemo } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";

type TermStatus = "not_used" | "consider_using_more" | "in_suggested_range" | "slightly_above_range" | "consider_using_less";

function normalize(text: string) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function countOccurrences(text: string, term: string) {
    if (!term) return 0;
    const normalizedText = normalize(text);
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return 0;
    return normalizedText.split(normalizedTerm).length - 1;
}

function parseTerm(raw: string): { term: string; min: number; max: number } | null {
    const parts = raw.split("|").map(p => p.trim());
    if (parts.length === 1) {
        // Sem faixa: usar default 1-5
        return { term: parts[0], min: 1, max: 5 };
    }
    if (parts.length === 3) {
        // formato: termo|min|max
        const term = parts[0];
        const min = parseInt(parts[1], 10);
        const max = parseInt(parts[2], 10);
        if (term && !isNaN(min) && !isNaN(max)) {
            return { term, min, max };
        }
    }
    if (parts.length === 2 && parts[1].includes("-")) {
        // formato: termo|min-max
        const term = parts[0];
        const [minStr, maxStr] = parts[1].split("-").map(s => s.trim());
        const min = parseInt(minStr, 10);
        const max = parseInt(maxStr, 10);
        if (term && !isNaN(min) && !isNaN(max)) {
            return { term, min, max };
        }
    }
    return null;
}

function getTermStatus(count: number, min: number, max: number): TermStatus {
    if (count === 0) return "not_used";
    if (count < min) return "consider_using_more";
    if (count >= min && count <= max) return "in_suggested_range";
    if (count > max && count <= max * 1.2) return "slightly_above_range";
    return "consider_using_less";
}

export function TermsPanel() {
    const { docText, meta, editor } = useEditorContext();
    const [filter, setFilter] = useState<TermStatus | "all">("all");
    const [search, setSearch] = useState("");

    const termsData = useMemo(() => {
        const parsed: Array<{ term: string; min: number; max: number; count: number; status: TermStatus }> = [];

        // Parse supporting keywords
        for (const raw of meta.supportingKeywords) {
            const result = parseTerm(raw);
            if (result) {
                const count = countOccurrences(docText, result.term);
                const status = getTermStatus(count, result.min, result.max);
                parsed.push({ ...result, count, status });
            }
        }

        // Parse entities (sem faixa definida, usa padrão)
        for (const entity of meta.entities) {
            if (!parsed.find(p => normalize(p.term) === normalize(entity))) {
                const count = countOccurrences(docText, entity);
                const status = getTermStatus(count, 1, 5);
                parsed.push({ term: entity, min: 1, max: 5, count, status });
            }
        }

        return parsed;
    }, [docText, meta.supportingKeywords, meta.entities]);

    const filteredTerms = termsData.filter(t => {
        const matchesFilter = filter === "all" || t.status === filter;
        const matchesSearch = !search || normalize(t.term).includes(normalize(search));
        return matchesFilter && matchesSearch;
    });

    const handleCopyList = () => {
        const csv = "term,count,min,max,status\\n" +
            termsData.map(t => `${t.term},${t.count},${t.min},${t.max},${t.status}`).join("\\n");
        navigator.clipboard.writeText(csv);
    };

    const handleInsertTerm = (term: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent(term + " ").run();
    };

    const statusColors: Record<TermStatus, string> = {
        not_used: "border-2 border-red-600 bg-red-600 text-white font-semibold shadow-md",
        consider_using_more: "border-2 border-orange-600 bg-orange-600 text-white font-semibold shadow-md",
        in_suggested_range: "border-2 border-emerald-600 bg-emerald-600 text-white font-semibold shadow-md",
        slightly_above_range: "border-2 border-yellow-600 bg-yellow-600 text-white font-semibold shadow-md",
        consider_using_less: "border-2 border-red-700 bg-red-700 text-white font-semibold shadow-md"
    };

    return (
        <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
            <div className="flex items-center justify-between text-sm font-semibold uppercase text-(--text)">
                <span>Termos / LSI</span>
                <button
                    onClick={handleCopyList}
                    className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold"
                >
                    Copy
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar termo..."
                    className="w-full px-3 py-2 text-sm rounded-md border-2 border-(--border) bg-(--surface) text-(--text) outline-none placeholder:text-(--muted-2) focus:border-blue-500"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilter("all")}
                    className={`text-xs px-3 py-2 rounded-md font-semibold transition-colors ${filter === "all"
                        ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilter("not_used")}
                    className={`text-xs px-3 py-2 rounded-md font-semibold transition-colors ${filter === "not_used"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                >
                    Não usado
                </button>
                <button
                    onClick={() => setFilter("consider_using_more")}
                    className={`text-xs px-3 py-2 rounded-md font-semibold transition-colors ${filter === "consider_using_more"
                        ? "bg-orange-600 text-white"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                >
                    Usar mais
                </button>
                <button
                    onClick={() => setFilter("in_suggested_range")}
                    className={`text-xs px-3 py-2 rounded-md font-semibold transition-colors ${filter === "in_suggested_range"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                >
                    Na faixa
                </button>
                <button
                    onClick={() => setFilter("slightly_above_range")}
                    className={`text-xs px-3 py-2 rounded-md font-semibold transition-colors ${filter === "slightly_above_range"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                >
                    Acima
                </button>
                <button
                    onClick={() => setFilter("consider_using_less")}
                    className={`text-xs px-3 py-2 rounded-md font-semibold transition-colors ${filter === "consider_using_less"
                        ? "bg-red-700 text-white"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                >
                    Usar menos
                </button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-(--muted-2) bg-(--surface) p-2 rounded border border-(--border)">
                Termos (formato: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">termo|min|max</code> ou <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">termo|min-max</code>)
            </div>

            {/* Terms List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTerms.length === 0 && (
                    <p className="text-sm text-(--muted-2) text-center py-4">
                        {search ? "Nenhum termo encontrado na busca." : "Nenhum termo definido."}
                    </p>
                )}

                {filteredTerms.map((termData, index) => (
                    <div
                        key={index}
                        className={`rounded-lg p-3 ${statusColors[termData.status]} flex items-center justify-between gap-2`}
                    >
                        <div className="flex-1 overflow-hidden">
                            <div className="font-bold text-base truncate">{termData.term}</div>
                            <div className="text-xs mt-1 opacity-90">
                                <span className="font-mono">{termData.count}x</span> (faixa: {termData.min}-{termData.max})
                            </div>
                        </div>
                        <button
                            onClick={() => handleInsertTerm(termData.term)}
                            className="shrink-0 w-8 h-8 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
                            title="Inserir termo no cursor"
                        >
                            <span className="text-lg font-bold">+</span>
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
