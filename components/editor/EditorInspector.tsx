"use client";

import { useMemo, useState, type DragEvent } from "react";
import { CalendarClock, CheckCircle2, Globe2, Info, ShieldCheck, UserRound } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { EDITOR_AUTHOR_OPTIONS } from "@/lib/site/collaborators";

type Tab = "post" | "seo" | "eeat" | "publish";

const AUTHORS = EDITOR_AUTHOR_OPTIONS;

function counterTone(count: number, min: number, max: number) {
  if (count === 0) return "text-(--muted-2)";
  if (count < min || count > max) return "text-amber-400";
  return "text-emerald-600";
}

export function EditorInspector() {
  const {
    meta,
    setMeta,
    slugStatus,
    silos,
    lastSavedAt,
    saving,
    onSave,
    createSilo,
    refreshSilos,
    onHeroUpload,
    onOpenHeroPicker,
    onOpenMedia,
    onInsertImage,
    onUpdateImageAlt,
  } = useEditorContext();
  const [tab, setTab] = useState<Tab>("post");
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const seoTitleCount = meta.metaTitle.length;
  const seoDescCount = meta.metaDescription.length;

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return "Sem salvamento";
    const diff = Date.now() - lastSavedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes <= 0) return "Salvo agora";
    if (minutes === 1) return "Salvo há 1 min";
    return `Salvo há ${minutes} min`;
  }, [lastSavedAt]);

  const handleCreateSilo = async () => {
    const name = window.prompt("Nome do silo");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createSilo(trimmed);
    if (!created) return;
    await refreshSilos();
    setMeta({ siloId: created.id });
  };

  const handleHeroDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onHeroUpload(file);
  };

  const handleRemoveHero = () => {
    if (!meta.heroImageUrl) return;
    const confirmed = window.confirm("Remover a imagem de capa deste post?");
    if (!confirmed) return;
    setMeta({ heroImageUrl: "", heroImageAlt: "" });
  };

  const handleLibraryAltChange = (url: string, alt: string) => {
    onUpdateImageAlt(url, alt);
    if (meta.heroImageUrl === url) {
      setMeta({ heroImageAlt: alt });
    }
  };

  const images = meta.images ?? [];
  const fallbackHero =
    meta.heroImageUrl && !images.some((image) => image.url === meta.heroImageUrl)
      ? [{ url: meta.heroImageUrl, alt: meta.heroImageAlt }]
      : [];
  const displayImages = [...images, ...fallbackHero];


  return (
    <aside className="flex h-full w-[400px] flex-col border-l border-(--border) bg-(--surface)">
      <div className="flex border-b border-(--border) text-[11px] font-semibold uppercase text-(--muted)">
        <TabButton label="Post" active={tab === "post"} onClick={() => setTab("post")} />
        <TabButton label="SEO / KGR" active={tab === "seo"} onClick={() => setTab("seo")} />
        <TabButton label="E-E-A-T" active={tab === "eeat"} onClick={() => setTab("eeat")} />
        <TabButton label="Publicar" active={tab === "publish"} onClick={() => setTab("publish")} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs text-(--text)">
        {tab === "post" ? (
          <div className="space-y-4">
            <Field label="Título do post (H1)">
              <input
                value={meta.title}
                onChange={(event) => setMeta({ title: event.target.value })}
                placeholder="Novo post"
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Imagem de capa">
              <div
                className="overflow-hidden rounded-md border border-dashed border-(--border) bg-(--surface-muted)"
                onDrop={handleHeroDrop}
                onDragOver={(event) => event.preventDefault()}
                onClick={onOpenHeroPicker}
              >
                {meta.heroImageUrl && !brokenImages[meta.heroImageUrl] ? (
                  <img
                    src={meta.heroImageUrl}
                    alt={meta.heroImageAlt || "Capa"}
                    className="h-36 w-full object-cover"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [meta.heroImageUrl]: true }))
                    }
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center px-3 text-center text-xs text-(--muted-2)">
                    Arraste ou clique para enviar a imagem de capa
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-(--muted)">
                {meta.heroImageUrl ? "Clique na imagem para trocar." : "Use 1200x628 px para redes sociais."}
              </p>
              {meta.heroImageUrl ? (
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleRemoveHero}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Remover capa
                  </button>
                </div>
              ) : null}
            </Field>

            <Field label="Alt text da imagem de capa (obrigatório)">
              <input
                value={meta.heroImageAlt}
                onChange={(event) => setMeta({ heroImageAlt: event.target.value })}
                placeholder="Alt text da imagem de capa (obrigatório)"
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Lead / Introdução">
              <textarea
                rows={3}
                value={meta.metaDescription}
                onChange={(event) => setMeta({ metaDescription: event.target.value })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                placeholder="Resumo inicial do artigo"
              />
            </Field>

            <div className="rounded-md border border-(--border) bg-(--surface-muted) p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-(--muted)">
                <span>Mídia do post</span>
                <button
                  type="button"
                  onClick={onOpenMedia}
                  className="rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[10px] text-(--text) hover:border-emerald-400 hover:text-emerald-700"
                >
                  Inserir imagem no corpo
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {displayImages.length === 0 ? (
                  <p className="text-xs text-(--muted-2)">Nenhuma imagem enviada.</p>
                ) : (
                  displayImages.map((image) => {
                    const isHero = meta.heroImageUrl === image.url;
                    return (
                      <div
                        key={image.url}
                        className="flex items-start gap-3 rounded-md border border-(--border) bg-(--surface) p-2"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-(--border) bg-(--surface-muted)">
                          {image.url && !brokenImages[image.url] ? (
                            <img
                              src={image.url}
                              alt={image.alt || "Imagem"}
                              className="h-full w-full object-cover"
                              onError={() => setBrokenImages((prev) => ({ ...prev, [image.url]: true }))}
                            />
                          ) : (
                            <span className="px-1 text-[9px] text-(--muted-2)">Sem preview</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              value={image.alt}
                              onChange={(event) => handleLibraryAltChange(image.url, event.target.value)}
                              placeholder="Alt text"
                              className="w-full rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[11px] outline-none"
                            />
                            {isHero ? (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700">
                                Capa
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onInsertImage(image)}
                              className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] text-(--text) hover:border-emerald-400 hover:text-emerald-700"
                            >
                              Inserir no texto
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "seo" ? (
          <div className="space-y-4">
            <Field
              label="Slug"
              helper={
                slugStatus === "checking" ? "Checando..." : slugStatus === "taken" ? "Em uso" : slugStatus === "ok" ? "Disponível" : ""
              }
            >
              <input
                value={meta.slug}
                onChange={(event) => setMeta({ slug: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Focus keyword">
              <input
                value={meta.targetKeyword}
                onChange={(event) => setMeta({ targetKeyword: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="SEO title" helper={<span className={counterTone(seoTitleCount, 30, 60)}>{seoTitleCount}/60</span>}>
              <input
                value={meta.metaTitle}
                onChange={(event) => setMeta({ metaTitle: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field
              label="Meta description"
              helper={<span className={counterTone(seoDescCount, 150, 170)}>{seoDescCount}/170</span>}
            >
              <textarea
                rows={3}
                value={meta.metaDescription}
                onChange={(event) => setMeta({ metaDescription: event.target.value })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Supporting keywords (1 por linha)">
              <textarea
                rows={3}
                value={meta.supportingKeywords.join("\n")}
                onChange={(event) =>
                  setMeta({ supportingKeywords: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })
                }
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Entidades / LSI (1 por linha)">
              <textarea
                rows={3}
                value={meta.entities.join("\n")}
                onChange={(event) => setMeta({ entities: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-(--border) bg-(--surface) p-3 text-[11px] text-(--muted)">
              <p className="flex items-center gap-2 font-semibold uppercase text-(--muted)">
                <Globe2 size={12} /> Preview
              </p>
              <p className="mt-2 text-[11px] text-emerald-600">/{meta.slug || "slug"}</p>
              <p className="truncate text-sm font-semibold text-emerald-700">{meta.metaTitle || meta.title || "Título"}</p>
              <p className="text-[12px] text-(--muted) line-clamp-2">{meta.metaDescription || "Resumo do post"}</p>
            </div>
          </div>
        ) : null}

        {tab === "eeat" ? (
          <div className="space-y-4">
            <Field label="Autor (placeholder)">
              <select
                value={meta.authorName}
                onChange={(event) => setMeta({ authorName: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              >
                <option value="">Selecionar</option>
                {AUTHORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Links sameAs (1 por linha)">
              <textarea
                rows={3}
                value={meta.authorLinks.join("\n")}
                onChange={(event) => setMeta({ authorLinks: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                placeholder="https://linkedin.com/..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Revisado por">
                <input
                  value={meta.reviewedBy}
                  onChange={(event) => setMeta({ reviewedBy: event.target.value })}
                  className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Data da revisão">
                <input
                  type="datetime-local"
                  value={meta.reviewedAt}
                  onChange={(event) => setMeta({ reviewedAt: event.target.value })}
                  className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>

            <Field label="Disclaimer">
              <textarea
                rows={2}
                value={meta.disclaimer}
                onChange={(event) => setMeta({ disclaimer: event.target.value })}
                className="w-full resize-none rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-(--border) bg-(--surface) p-3 text-[11px] text-(--muted)">
              <p className="flex items-center gap-2 font-semibold uppercase text-(--muted)">
                <ShieldCheck size={12} /> Checklist
              </p>
              <Check label="Autor preenchido" ok={Boolean(meta.authorName)} />
              <Check label="Links sameAs" ok={meta.authorLinks.length > 0} />
              <Check label="Revisão preenchida" ok={Boolean(meta.reviewedAt)} />
              <Check label="Disclaimer" ok={Boolean(meta.disclaimer)} />
            </div>
          </div>
        ) : null}

        {tab === "publish" ? (
          <div className="space-y-4">
            <Field label="Status">
              <select
                value={meta.status}
                onChange={(event) => setMeta({ status: event.target.value as typeof meta.status })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              >
                <option value="draft">Rascunho</option>
                <option value="review">Revisão</option>
                <option value="published">Publicado</option>
              </select>
            </Field>

            <Field
              label={
                <>
                  <span>Silo</span>
                  <button
                    type="button"
                    onClick={() => void handleCreateSilo()}
                    className="flex h-5 w-5 items-center justify-center rounded border border-(--border-strong) text-[10px] text-(--text) hover:border-emerald-400 hover:text-emerald-700"
                    title="Criar silo"
                  >
                    +
                  </button>
                </>
              }
            >
              <select
                value={meta.siloId}
                onChange={(event) => setMeta({ siloId: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              >
                <option value="">Sem silo</option>
                {silos.map((silo) => (
                  <option key={silo.id} value={silo.id}>
                    {silo.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Silo Hierarchy */}
            {meta.siloId && (
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-3">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase text-orange-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    <path d="m13 13 6 6" />
                  </svg>
                  Hierarquia no Silo
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Papel">
                    <select
                      value={meta.siloRole ?? "SUPPORT"}
                      onChange={(event) => setMeta({ siloRole: event.target.value as "PILLAR" | "SUPPORT" | "AUX" })}
                      className="w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm font-semibold text-orange-900 outline-none ring-orange-400 focus:ring-2"
                    >
                      <option value="PILLAR">🏛️ Pilar</option>
                      <option value="SUPPORT">🔧 Suporte</option>
                      <option value="AUX">📎 Apoio</option>
                    </select>
                  </Field>

                  <Field label="Posição">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={meta.siloPosition ?? 1}
                      onChange={(event) => setMeta({ siloPosition: parseInt(event.target.value, 10) || 1 })}
                      className="w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm font-semibold text-orange-900 outline-none ring-orange-400 focus:ring-2"
                    />
                  </Field>
                </div>

                <div className="mt-3 rounded-md bg-white/60 p-2 text-[10px] text-orange-800">
                  <p className="font-semibold">💡 Dica:</p>
                  <p className="mt-1">
                    <strong>Pilar:</strong> Post principal do silo (normalmente 1 por silo).
                  </p>
                  <p className="mt-1">
                    <strong>Suporte:</strong> Posts que reforçam o pilar (ordenados por importância).
                  </p>
                  <p className="mt-1">
                    <strong>Apoio:</strong> Conteúdo complementar ou periférico.
                  </p>
                </div>
              </div>
            )}

            <Field label="Agendamento (opcional)">
              <input
                type="datetime-local"
                value={meta.scheduledAt}
                onChange={(event) => setMeta({ scheduledAt: event.target.value })}
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Canonical">
              <input
                value={meta.canonicalPath}
                onChange={(event) => setMeta({ canonicalPath: event.target.value })}
                placeholder="/silo/slug"
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-(--border) bg-(--surface) p-3 text-[11px] text-(--muted)">
              <p className="flex items-center gap-2 font-semibold uppercase text-(--muted)">
                <Info size={12} /> Status
              </p>
              <p className="mt-2 flex items-center gap-2 text-(--muted)">
                <CalendarClock size={12} />
                {saving ? "Salvando..." : lastSavedLabel}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onSave()}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-500"
                >
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => void onSave("published")}
                  className="rounded-md bg-orange-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-orange-400"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, helper, children }: { label: React.ReactNode; helper?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-(--muted)">
        <div className="flex items-center gap-2">{label}</div>
        {helper}
      </div>
      {children}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-3 ${active ? "border-emerald-500 text-emerald-700" : "border-transparent text-(--muted-2)"
        }`}
    >
      {label}
    </button>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {ok ? <CheckCircle2 size={12} className="text-emerald-400" /> : <UserRound size={12} className="text-(--muted-2)" />}
      <span className={ok ? "text-(--text)" : "text-(--muted-2)"}>{label}</span>
    </div>
  );
}
