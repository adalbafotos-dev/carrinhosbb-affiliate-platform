"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { EditorContent } from "@tiptap/react";
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
    meta,
    setMeta,
    onHeroUpload,
    onOpenHeroPicker,
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

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onHeroUpload(file);
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-zinc-950">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="text-zinc-200">Editor</span>
              <span className="h-1 w-24 rounded-full bg-zinc-800">
                <span
                  className="block h-1 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, scrollProgress * 100)}%` }}
                />
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={saving ? "text-amber-400" : "text-zinc-400"}>{saving ? "Salvando..." : savedLabel}</span>
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

        <div className="mx-auto w-full max-w-5xl px-6 py-6">
          <div
            className="rounded-xl border border-zinc-900 bg-zinc-900 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <div
              className="aspect-[16/9] w-full overflow-hidden rounded-t-xl border-b border-zinc-800 bg-zinc-900"
              onClick={onOpenHeroPicker}
            >
              {meta.heroImageUrl ? (
                <img
                  src={meta.heroImageUrl}
                  alt={meta.heroImageAlt || "Hero"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                  Arraste ou clique para enviar a imagem de capa
                </div>
              )}
            </div>

            <div className="border-b border-zinc-800 px-6 py-5">
              <textarea
                placeholder="Título do post (H1)"
                value={meta.title}
                onChange={(event) => setMeta({ title: event.target.value })}
                rows={1}
                className="w-full resize-none bg-transparent text-3xl font-semibold text-white outline-none placeholder:text-zinc-500"
                onInput={(event) => {
                  const element = event.currentTarget;
                  element.style.height = "auto";
                  element.style.height = `${element.scrollHeight}px`;
                }}
              />
              <input
                value={meta.heroImageAlt}
                onChange={(event) => setMeta({ heroImageAlt: event.target.value })}
                placeholder="Alt text da imagem de capa (obrigatório)"
                className="mt-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none"
              />
            </div>

            <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-5">
              <label className="text-[11px] font-semibold uppercase text-zinc-400">
                Lead / Introdução
              </label>
              <textarea
                rows={3}
                value={meta.metaDescription}
                onChange={(event) => setMeta({ metaDescription: event.target.value })}
                className="mt-2 w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                placeholder="Resumo inicial do artigo"
              />
            </div>

            <div className="px-6 py-6">
              {editor ? (
                <div className="prose prose-invert max-w-none">
                  <EditorContent editor={editor} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
