"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent } from "@tiptap/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FixedToolbar } from "@/components/editor/FixedToolbar";
import { useEditorContext } from "@/components/editor/EditorContext";

function formatRelativeTime(value?: Date | null) {
  if (!value) return "Sem salvamento recente";
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes <= 0) return "Salvo agora";
  if (minutes === 1) return "Salvo há 1 min";
  return `Salvo há ${minutes} min`;
}

export function EditorCanvas() {
  const {
    editor,
    onOpenLinkDialog,
    onOpenMedia,
    onInsertProduct,
    onInsertYoutube,
    onInsertTable,
    onInsertCallout,
    onAlignImage,
    saving,
    lastSavedAt,
    onSave,
  } = useEditorContext();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => {
      const max = element.scrollHeight - element.clientHeight;
      setScrollProgress(max > 0 ? element.scrollTop / max : 0);
    };
    onScroll();
    element.addEventListener("scroll", onScroll);
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  const savedLabel = useMemo(() => formatRelativeTime(lastSavedAt), [lastSavedAt]);

  return (
    <div className="flex h-full flex-1 flex-col bg-(--bg)">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-(--border) bg-(--surface)">
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-(--muted)">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text) hover:bg-(--surface-muted)"
              >
                <ArrowLeft size={12} />
                Voltar ao admin
              </Link>
              <span className="text-(--text)">Editor</span>
              <span className="h-1 w-24 rounded-full bg-(--surface-muted)">
                <span
                  className="block h-1 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, scrollProgress * 100)}%` }}
                />
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={saving ? "text-amber-400" : "text-(--muted)"}>
                {saving ? "Salvando..." : savedLabel}
              </span>
              <button
                type="button"
                onClick={() => void onSave()}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
              >
                Salvar
              </button>
            </div>
          </div>
          <FixedToolbar
            editor={editor}
            onOpenLink={onOpenLinkDialog}
            onOpenMedia={onOpenMedia}
            onInsertProduct={onInsertProduct}
            onInsertYoutube={onInsertYoutube}
            onInsertTable={onInsertTable}
            onInsertCallout={onInsertCallout}
            onAlignImage={onAlignImage}
          />
        </div>

        <div className="mx-auto w-full max-w-5xl px-6 py-6 min-h-screen">
          {editor ? (
            <div className="prose max-w-none">
              <EditorContent editor={editor} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
