"use client";

import { useEditorContext } from "@/components/editor/EditorContext";
import { GuardianPanel } from "@/components/editor/GuardianPanel";
import { TermsPanel } from "@/components/editor/TermsPanel";
import { LinkHygienePanel } from "@/components/editor/LinkHygienePanel";
import { InternalLinksPanel } from "@/components/editor/InternalLinksPanel";
import { PlagiarismInspectorPanel } from "@/components/editor/PlagiarismInspectorPanel";
import { TextSearchPanel } from "@/components/editor/TextSearchPanel";
import { FileText } from "lucide-react";
import { SerpAnalysisPanel } from "@/components/serp/SerpAnalysisPanel";

export function ContentIntelligence() {
  const { outline, onJumpToHeading, meta } = useEditorContext();

  return (
    <aside className="flex h-full w-[400px] flex-col border-r border-(--border) bg-(--surface)">
      <div className="border-b border-(--border) px-4 py-3 text-[11px] font-semibold uppercase text-(--muted)">Inteligência</div>

      <div id="intelligence-scroll-container" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <GuardianPanel />

        <section>
          <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase text-(--muted)">
            <FileText size={14} />
            Outline (H2/H3/H4)
          </h3>
          <div className="mt-3 space-y-1 border-l border-(--border) pl-3">
            {outline.length === 0 ? (
              <p className="text-xs text-(--muted-2)">Nenhum heading.</p>
            ) : (
              outline.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToHeading(item.pos)}
                  className={`block w-full truncate text-left text-xs text-(--text) hover:text-(--brand-accent) ${item.level === 3
                    ? "pl-3 text-(--muted)"
                    : item.level === 4
                      ? "pl-5 text-(--muted-2)"
                      : ""
                    }`}
                >
                  {item.text}
                </button>
              ))
            )}
          </div>
        </section>

        <TextSearchPanel />

        <TermsPanel />

        <InternalLinksPanel />

        <SerpAnalysisPanel
          defaultQuery={meta.targetKeyword || meta.title}
          intentSource={meta.title || meta.targetKeyword}
          title="Analise SERP (Post)"
        />

        <PlagiarismInspectorPanel />

        <LinkHygienePanel />
      </div>
    </aside>
  );
}
