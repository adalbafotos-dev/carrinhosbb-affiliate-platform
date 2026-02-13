"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import {
  clearFindInContent,
  getFindInContentState,
  jumpToFindResult,
  setFindInContentActiveIndex,
  setFindInContentQuery,
} from "@/components/editor/extensions/FindInContent";

type FindPreviewItem = {
  index: number;
  from: number;
  to: number;
  before: string;
  match: string;
  after: string;
};

function buildSnippet(value: string, maxChars: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  return `...${text.slice(Math.max(0, text.length - maxChars)).trim()}`;
}

export function TextSearchPanel() {
  const { editor, docText } = useEditorContext();
  const [queryInput, setQueryInput] = useState("");

  const findState = getFindInContentState(editor);
  const totalMatches = findState.ranges.length;
  const activeIndex = totalMatches > 0 ? findState.activeIndex : -1;

  const previews = useMemo(() => {
    if (!editor || !totalMatches) return [];
    const maxItems = 40;
    const items = findState.ranges.slice(0, maxItems).map((range, index) => {
      const from = Math.max(1, range.from - 48);
      const to = Math.min(editor.state.doc.content.size, range.to + 48);
      const before = buildSnippet(editor.state.doc.textBetween(from, range.from, " ", " "), 48);
      const match = editor.state.doc.textBetween(range.from, range.to, " ", " ");
      const after = buildSnippet(editor.state.doc.textBetween(range.to, to, " ", " "), 48);
      return {
        index,
        from: range.from,
        to: range.to,
        before,
        match,
        after,
      } satisfies FindPreviewItem;
    });
    return items;
  }, [editor, findState.ranges, totalMatches, docText]);

  useEffect(() => {
    if (!editor) return;
    return () => {
      clearFindInContent(editor);
    };
  }, [editor]);

  const runSearch = () => {
    if (!editor) return;
    setFindInContentQuery(editor, queryInput);
    const next = getFindInContentState(editor);
    if (next.ranges.length > 0) {
      jumpToFindResult(editor, next.ranges[0]);
    }
  };

  const clearSearch = () => {
    if (!editor) return;
    setQueryInput("");
    clearFindInContent(editor);
  };

  const focusResult = (index: number) => {
    if (!editor || !totalMatches) return;
    const safeIndex = Math.min(totalMatches - 1, Math.max(0, index));
    const range = findState.ranges[safeIndex];
    if (!range) return;
    setFindInContentActiveIndex(editor, safeIndex);
    jumpToFindResult(editor, range);
  };

  const jumpRelative = (delta: number) => {
    if (!totalMatches) return;
    const base = activeIndex >= 0 ? activeIndex : 0;
    const next = (base + delta + totalMatches) % totalMatches;
    focusResult(next);
  };

  return (
    <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-1.5">
          <Search size={14} />
          Buscar No Artigo
        </span>
        <span className="text-[10px] text-(--muted-2)">
          {totalMatches} resultado{totalMatches === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runSearch();
            }
          }}
          placeholder="Digite palavra ou frase..."
          className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-[11px] text-(--text) outline-none placeholder:text-(--muted-2)"
        />
        <button
          type="button"
          onClick={runSearch}
          className="rounded-md bg-(--text) px-3 py-2 text-[10px] font-semibold text-(--surface)"
        >
          Buscar
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => jumpRelative(-1)}
          disabled={!totalMatches}
          className="flex-1 rounded-md border border-(--border) bg-(--surface) px-2 py-1.5 text-[10px] font-semibold text-(--text) disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => jumpRelative(1)}
          disabled={!totalMatches}
          className="flex-1 rounded-md border border-(--border) bg-(--surface) px-2 py-1.5 text-[10px] font-semibold text-(--text) disabled:opacity-50"
        >
          Proxima
        </button>
        <button
          type="button"
          onClick={clearSearch}
          className="rounded-md border border-(--border) bg-(--surface) px-2 py-1.5 text-[10px] font-semibold text-(--text)"
        >
          Limpar
        </button>
      </div>

      {totalMatches > 0 ? (
        <div className="max-h-[180px] space-y-1 overflow-y-auto rounded border border-(--border) bg-(--surface) p-2">
          {previews.map((item) => (
            <button
              key={`${item.from}-${item.to}-${item.index}`}
              type="button"
              onClick={() => focusResult(item.index)}
              className={`w-full rounded border px-2 py-1 text-left text-[10px] ${
                item.index === activeIndex
                  ? "border-blue-300 bg-blue-50 text-blue-800"
                  : "border-(--border) bg-(--surface-muted) text-(--text)"
              }`}
            >
              <span className="font-semibold">#{item.index + 1}</span>{" "}
              <span className="text-(--muted)">{item.before}</span>{" "}
              <mark className="rounded bg-yellow-200 px-0.5 text-(--text)">{item.match}</mark>{" "}
              <span className="text-(--muted)">{item.after}</span>
            </button>
          ))}
          {totalMatches > previews.length ? (
            <p className="text-[10px] text-(--muted-2)">
              Mostrando {previews.length} de {totalMatches} resultados.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
          Use o campo acima para localizar palavra ou frase no artigo e navegar pelo contexto.
        </div>
      )}
    </section>
  );
}
