"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { Calendar, Check, Image as ImageIcon, Search, SlidersHorizontal, User } from "lucide-react";
import type { Silo } from "@/lib/types";

export type EditorMetaState = {
  title: string;
  seoTitle: string;
  slug: string;
  focusKeyword: string;
  metaDescription: string;
  coverImage: string;
  coverImageAlt: string;
  author: string;
  publicationDate: string;
  siloId: string;
};

type Props = {
  meta: EditorMetaState;
  silos: Silo[];
  contentText: string;
  onChange: (patch: Partial<EditorMetaState>) => void;
  onCoverImageFile: (file: File) => void;
  reviewPending?: boolean;
  statusLocked?: boolean;
  statusLabel?: string;
  onReviewChange?: (value: boolean) => void;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function EditorInspector({
  meta,
  silos,
  contentText,
  onChange,
  onCoverImageFile,
  reviewPending = false,
  statusLocked = false,
  statusLabel = "Rascunho",
  onReviewChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<"settings" | "seo" | "media">("settings");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const metaTitleCount = meta.seoTitle.length;
  const metaDescriptionCount = meta.metaDescription.length;

  const metaTitlePercent = Math.min(100, (metaTitleCount / 60) * 100);
  const metaDescriptionPercent = Math.min(100, (metaDescriptionCount / 160) * 100);

  const seoTitleOk = metaTitleCount >= 30 && metaTitleCount <= 60;
  const metaDescriptionOk = metaDescriptionCount >= 120 && metaDescriptionCount <= 160;

  const density = useMemo(() => {
    if (!meta.focusKeyword.trim()) return 0;
    const words = contentText.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    const escaped = meta.focusKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const matches = contentText.match(regex);
    return ((matches ? matches.length : 0) / words.length) * 100;
  }, [contentText, meta.focusKeyword]);

  const keywordReady = meta.focusKeyword.trim().length > 0;
  const keywordInUrl = keywordReady && meta.slug.includes(slugify(meta.focusKeyword));
  const keywordInH1 = keywordReady && normalize(meta.title).includes(normalize(meta.focusKeyword));
  const keywordDensityOk = density >= 0.5 && density <= 2.0;

  const h1TitleUrlMatch =
    meta.title.trim().length > 0 &&
    meta.seoTitle.trim().length > 0 &&
    meta.title.trim() === meta.seoTitle.trim() &&
    slugify(meta.title) === meta.slug;

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onCoverImageFile(file);
    }
  }

  return (
    <aside className="flex h-full w-[350px] flex-col border-l border-zinc-200 bg-white">
      <div className="flex border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 px-4 py-3 text-center ${
            activeTab === "settings" ? "border-b-2 border-zinc-900 text-zinc-900" : "hover:text-zinc-700"
          }`}
        >
          Config
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seo")}
          className={`flex-1 px-4 py-3 text-center ${
            activeTab === "seo" ? "border-b-2 border-blue-600 text-blue-600" : "hover:text-zinc-700"
          }`}
        >
          SEO
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`flex-1 px-4 py-3 text-center ${
            activeTab === "media" ? "border-b-2 border-amber-600 text-amber-600" : "hover:text-zinc-700"
          }`}
        >
          Mídia
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "settings" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Slug</label>
              <input
                value={meta.slug}
                onChange={(e) => onChange({ slug: e.target.value })}
                className="mt-2 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                placeholder="slug-do-post"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Categoria (Silo)</label>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                <SlidersHorizontal size={14} className="text-zinc-400" />
                <select
                  value={meta.siloId}
                  onChange={(e) => onChange({ siloId: e.target.value })}
                  className="w-full bg-transparent outline-none"
                >
                  <option value="">Selecione...</option>
                  {silos.map((silo) => (
                    <option key={silo.id} value={silo.id}>
                      {silo.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Autor</label>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                <User size={14} className="text-zinc-400" />
                <select
                  value={meta.author}
                  onChange={(e) => onChange({ author: e.target.value })}
                  className="w-full bg-transparent outline-none"
                >
                  <option value="Equipe">Equipe</option>
                  <option value="Convidado">Convidado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Data</label>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                <Calendar size={14} className="text-zinc-400" />
                <input
                  type="datetime-local"
                  value={meta.publicationDate}
                  onChange={(e) => onChange({ publicationDate: e.target.value })}
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Status de fluxo</label>
              {statusLocked ? (
                <div className="mt-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                  {statusLabel}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                  <select
                    value={reviewPending ? "review" : "draft"}
                    onChange={(e) => onReviewChange?.(e.target.value === "review")}
                    className="w-full bg-transparent outline-none"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="review">Revisão</option>
                  </select>
                </div>
              )}
              {statusLocked ? (
                <p className="mt-1 text-[10px] text-zinc-400">
                  O status muda automaticamente para Agendado ou Publicado.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "seo" && (
          <div className="space-y-5">
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
              <label className="text-xs font-semibold uppercase text-blue-700">Palavra-chave foco</label>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm">
                <Search size={14} className="text-blue-400" />
                <input
                  value={meta.focusKeyword}
                  onChange={(e) => onChange({ focusKeyword: e.target.value })}
                  className="w-full bg-transparent outline-none"
                  placeholder="Ex: cabine sun 5 original"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-blue-700">
                <span>Densidade</span>
                <span className={keywordDensityOk ? "text-emerald-600" : "text-amber-600"}>
                  {density.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-zinc-500">Google Preview</label>
              <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <div className="h-5 w-5 rounded-full bg-zinc-100" />
                  <div>
                    <p>seusite.com.br</p>
                    <p className="text-[9px] text-zinc-400">{meta.slug || "slug"}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  {meta.seoTitle || meta.title || "Título do post..."}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {meta.metaDescription || "Descrição do post vai aparecer aqui..."}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-semibold uppercase">Meta Title</span>
                <span className={seoTitleOk ? "text-emerald-600" : "text-rose-600"}>
                  {metaTitleCount}/60
                </span>
              </div>
              <input
                value={meta.seoTitle}
                onChange={(e) => onChange({ seoTitle: e.target.value })}
                className="peer mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <p className="mt-1 text-[10px] text-zinc-400 peer-focus:text-zinc-600">
                Ideal entre 30 e 60 caracteres.
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100">
                <div
                  className={`h-1.5 rounded-full ${seoTitleOk ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${metaTitlePercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-semibold uppercase">Meta Description</span>
                <span className={metaDescriptionOk ? "text-emerald-600" : "text-rose-600"}>
                  {metaDescriptionCount}/160
                </span>
              </div>
              <textarea
                rows={4}
                value={meta.metaDescription}
                onChange={(e) => onChange({ metaDescription: e.target.value })}
                className="peer mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <p className="mt-1 text-[10px] text-zinc-400 peer-focus:text-zinc-600">
                Ideal entre 120 e 160 caracteres.
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100">
                <div
                  className={`h-1.5 rounded-full ${metaDescriptionOk ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${metaDescriptionPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 p-3 text-xs text-zinc-600">
              <p className="font-semibold uppercase text-zinc-500">Checklist</p>
              <div className="mt-2 space-y-1">
                <ChecklistItem ok={keywordInUrl} label="Keyword na URL" />
                <ChecklistItem ok={keywordInH1} label="Keyword no H1" />
                <ChecklistItem ok={keywordDensityOk} label="Keyword density ok" />
              </div>
              {!h1TitleUrlMatch ? (
                <p className="mt-3 text-[11px] text-amber-600">
                  H1, Title Tag e URL precisam bater exatamente.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "media" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Featured Image</label>
              <div
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center"
              >
                {meta.coverImage ? (
                  <img
                    src={meta.coverImage}
                    alt={meta.coverImageAlt || "Imagem destacada"}
                    className="h-40 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <span className="rounded-full bg-white p-2 text-zinc-400">
                      <ImageIcon size={16} />
                    </span>
                    <span className="text-xs">Arraste ou clique para enviar</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCoverImageFile(file);
                }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Alt Text</label>
              <input
                value={meta.coverImageAlt}
                onChange={(e) => onChange({ coverImageAlt: e.target.value })}
                className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder="Texto alternativo da imagem"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border text-[9px] ${
          ok ? "border-emerald-400 text-emerald-600" : "border-zinc-200 text-zinc-400"
        }`}
      >
        {ok ? <Check size={12} /> : ""}
      </span>
    </div>
  );
}
