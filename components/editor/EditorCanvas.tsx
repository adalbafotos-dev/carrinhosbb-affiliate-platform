"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { EditorContent } from "@tiptap/react";
import { FixedToolbar } from "@/components/editor/FixedToolbar";
import { useEditorContext } from "@/components/editor/EditorContext";

export function EditorCanvas() {
  const {
    editor,
    meta,
    setMeta,
    previewMode,
    onHeroUpload,
    onOpenHeroPicker,
    onOpenLinkDialog,
    onOpenMedia,
    onInsertProduct,
    onInsertYoutube,
    onInsertTable,
    onInsertSection,
    onInsertFaq,
    onInsertHowTo,
    onInsertCtaBest,
    onInsertCtaValue,
    onInsertCtaTable,
    onAlignImage,
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

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onHeroUpload(file);
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-zinc-100">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="sticky top-0 z-30 bg-zinc-100">
          <div className="h-1 w-full bg-zinc-200">
            <div
              className="h-1 bg-zinc-900"
              style={{ width: `${Math.min(100, scrollProgress * 100)}%` }}
            />
          </div>
          <FixedToolbar
            editor={editor}
            onOpenLink={onOpenLinkDialog}
            onOpenMedia={onOpenMedia}
            onInsertProduct={onInsertProduct}
            onInsertYoutube={onInsertYoutube}
            onInsertTable={onInsertTable}
            onInsertSection={onInsertSection}
            onInsertFaq={onInsertFaq}
            onInsertHowTo={onInsertHowTo}
            onInsertCtaBest={onInsertCtaBest}
            onInsertCtaValue={onInsertCtaValue}
            onInsertCtaTable={onInsertCtaTable}
            onAlignImage={onAlignImage}
          />
        </div>

        <div
          className={`mx-auto w-full px-6 py-6 ${
            previewMode === "mobile" ? "max-w-[420px]" : "max-w-[900px]"
          }`}
        >
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div
              className="aspect-[16/9] w-full overflow-hidden rounded-t-xl border-b border-zinc-200 bg-zinc-50"
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              onClick={onOpenHeroPicker}
            >
              {meta.heroImageUrl ? (
                <img
                  src={meta.heroImageUrl}
                  alt={meta.heroImageAlt || "Hero"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                  Arraste ou clique para enviar a imagem de capa
                </div>
              )}
            </div>

            <div className="border-b border-zinc-200 px-6 py-5">
              <textarea
                placeholder="Titulo do post (H1)"
                value={meta.title}
                onChange={(event) => setMeta({ title: event.target.value })}
                rows={1}
                className="w-full resize-none bg-transparent text-3xl font-semibold text-zinc-900 outline-none placeholder:text-zinc-300"
                onInput={(event) => {
                  const element = event.currentTarget;
                  element.style.height = "auto";
                  element.style.height = `${element.scrollHeight}px`;
                }}
              />
              <input
                value={meta.heroImageAlt}
                onChange={(event) => setMeta({ heroImageAlt: event.target.value })}
                placeholder="Alt text da imagem de capa (obrigatorio)"
                className="mt-3 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 outline-none"
              />
            </div>

            <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-5">
              <label className="text-[11px] font-semibold uppercase text-zinc-500">
                Lead / Meta description
              </label>
              <textarea
                rows={3}
                value={meta.metaDescription}
                onChange={(event) => setMeta({ metaDescription: event.target.value })}
                className="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                placeholder="Resumo inicial do artigo"
              />
            </div>

            <div className="px-6 py-6">{editor ? <EditorContent editor={editor} /> : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
