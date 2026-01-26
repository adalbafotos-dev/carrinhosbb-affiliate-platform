"use client";

import { useEditorContext } from "@/components/editor/EditorContext";
import { GuardianPanel } from "@/components/editor/GuardianPanel";
import { TermsPanel } from "@/components/editor/TermsPanel";
import { LinkHygienePanel } from "@/components/editor/LinkHygienePanel";
import { FileText } from "lucide-react";

export function ContentIntelligence() {
  const { outline, onJumpToHeading } = useEditorContext();

  return (
    <aside className="flex h-full w-[320px] flex-col border-r border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="border-b border-[color:var(--border)] px-4 py-3 text-[11px] font-semibold uppercase text-[color:var(--muted)]">Inteligência</div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <GuardianPanel />

        <section>
          <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase text-[color:var(--muted)]">
            <FileText size={14} />
            Outline (H2/H3/H4)
          </h3>
          <div className="mt-3 space-y-1 border-l border-[color:var(--border)] pl-3">
            {outline.length === 0 ? (
              <p className="text-xs text-[color:var(--muted-2)]">Nenhum heading.</p>
            ) : (
              outline.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToHeading(item.pos)}
                  className={`block w-full truncate text-left text-xs text-[color:var(--text)] hover:text-[color:var(--brand-accent)] ${item.level === 3
                      ? "pl-3 text-[color:var(--muted)]"
                      : item.level === 4
                        ? "pl-5 text-[color:var(--muted-2)]"
                        : ""
                    }`}
                >
                  {item.text}
                </button>
              ))
            )}
          </div>
        </section>

        <TermsPanel />

        <LinkHygienePanel />
      </div>
    </aside>
  );
}
