"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { EditorContent } from "@tiptap/react";
import { FixedToolbar } from "@/components/editor/FixedToolbar";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { EditorMeta } from "@/components/editor/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatCount(count: number, min: number, max: number) {
  if (count === 0) return "text-zinc-400";
  if (count < min || count > max) return "text-rose-600";
  return "text-emerald-600";
}

export function EditorCanvas() {
  const {
    editor,
    meta,
    setMeta,
    slugStatus,
    previewMode,
    setPreviewMode,
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
  const onMetaChange = (patch: Partial<EditorMeta>) => setMeta(patch);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const metaTitleCount = meta.metaTitle.length;
  const metaDescriptionCount = meta.metaDescription.length;

  const supportingValue = useMemo(() => meta.supportingKeywords.join("\n"), [meta.supportingKeywords]);
  const entitiesValue = useMemo(() => meta.entities.join("\n"), [meta.entities]);

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
                onChange={(event) => onMetaChange({ title: event.target.value })}
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
                onChange={(event) => onMetaChange({ heroImageAlt: event.target.value })}
                placeholder="Alt text da imagem de capa (obrigatorio)"
                className="mt-3 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 outline-none"
              />
            </div>

            <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Meta do Post</h2>
                <button
                  type="button"
                  onClick={() => onMetaChange({ slug: slugify(meta.title) })}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  Gerar slug do titulo
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Meta title</label>
                  <input
                    value={meta.metaTitle}
                    onChange={(event) => onMetaChange({ metaTitle: event.target.value })}
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                  />
                  <p className={`mt-1 text-[10px] ${formatCount(metaTitleCount, 30, 60)}`}>
                    {metaTitleCount}/60
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Slug</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={meta.slug}
                      onChange={(event) => onMetaChange({ slug: event.target.value })}
                      className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                    />
                    <span className="text-[10px] text-zinc-400">
                      {slugStatus === "checking"
                        ? "Checando..."
                        : slugStatus === "ok"
                          ? "OK"
                          : slugStatus === "taken"
                            ? "Em uso"
                            : ""}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Meta description</label>
                  <textarea
                    rows={3}
                    value={meta.metaDescription}
                    onChange={(event) => onMetaChange({ metaDescription: event.target.value })}
                    className="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                  />
                  <p className={`mt-1 text-[10px] ${formatCount(metaDescriptionCount, 160, 170)}`}>
                    {metaDescriptionCount}/170
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Target keyword</label>
                  <input
                    value={meta.targetKeyword}
                    onChange={(event) => onMetaChange({ targetKeyword: event.target.value })}
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Schema type</label>
                  <select
                    value={meta.schemaType}
                    onChange={(event) =>
                      onMetaChange({ schemaType: event.target.value as EditorMeta["schemaType"] })
                    }
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                  >
                    <option value="article">Article</option>
                    <option value="review">Review</option>
                    <option value="faq">FAQ</option>
                    <option value="howto">HowTo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">
                    Supporting keywords
                  </label>
                  <textarea
                    rows={3}
                    value={supportingValue}
                    onChange={(event) =>
                      onMetaChange({
                        supportingKeywords: event.target.value
                          .split(/\n+/)
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    className="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                    placeholder="Uma por linha"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Entidades / LSI</label>
                  <textarea
                    rows={3}
                    value={entitiesValue}
                    onChange={(event) =>
                      onMetaChange({
                        entities: event.target.value
                          .split(/\n+/)
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    className="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                    placeholder="Uma por linha"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Status</label>
                  <select
                    value={meta.status}
                    onChange={(event) =>
                      onMetaChange({ status: event.target.value as EditorMeta["status"] })
                    }
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="review">Revisao</option>
                    <option value="scheduled">Agendado</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-zinc-500">Agendar</label>
                  <input
                    type="datetime-local"
                    value={meta.scheduledAt}
                    onChange={(event) => onMetaChange({ scheduledAt: event.target.value })}
                    className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-6">{editor ? <EditorContent editor={editor} /> : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
