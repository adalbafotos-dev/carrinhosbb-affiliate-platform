"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Link2,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { EditorMeta } from "@/components/editor/types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

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

function getFirstParagraph(html: string) {
  const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (!match) return "";
  return match[1].replace(/<[^>]+>/g, "").trim();
}

function counterTone(count: number, min: number, max: number) {
  if (count === 0) return "text-zinc-400";
  if (count < min || count > max) return "text-amber-600";
  return "text-emerald-600";
}

export function EditorInspector() {
  const {
    meta,
    setMeta,
    docText,
    docHtml,
    outline,
    links,
    slugStatus,
    silos,
    onSelectLink,
    onInsertImage,
    onUpdateImageAlt,
    onRemoveImage,
  } = useEditorContext();
  const [tab, setTab] = useState<"config" | "seo" | "media" | "guardian">("config");

  const wordCount = useMemo(() => {
    const words = docText.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [docText]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const firstParagraph = normalize(getFirstParagraph(docHtml));
  const keyword = normalize(meta.targetKeyword);
  const keywordReady = keyword.length > 0;
  const keywordInFirst = keywordReady && firstParagraph.includes(keyword);
  const keywordInH1 = keywordReady && normalize(meta.title).includes(keyword);
  const keywordInSlug = keywordReady && meta.slug.includes(meta.targetKeyword.toLowerCase().replace(/\s+/g, "-"));
  const exactMatch = normalize(meta.title) === normalize(meta.metaTitle) && slugify(meta.title) === meta.slug;

  const density = useMemo(() => {
    if (!keywordReady) return 0;
    const words = docText.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    const escaped = meta.targetKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const matches = docText.match(regex);
    return ((matches ? matches.length : 0) / words.length) * 100;
  }, [docText, keywordReady, meta.targetKeyword]);

  const supportingStats = useMemo(() => {
    return meta.supportingKeywords.map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      const matches = docText.match(regex);
      return { term, count: matches ? matches.length : 0 };
    });
  }, [docText, meta.supportingKeywords]);

  const entityStats = useMemo(() => {
    return meta.entities.map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      const matches = docText.match(regex);
      return { term, count: matches ? matches.length : 0 };
    });
  }, [docText, meta.entities]);

  const headingStats = useMemo(() => {
    const total = outline.length;
    const keywordHits = outline.filter((item) => normalize(item.text).includes(keyword)).length;
    return { total, keywordHits };
  }, [outline, keyword]);

  const linkStats = useMemo(() => {
    const internal = links.filter((link) => ["internal", "mention", "about"].includes(link.type)).length;
    const external = links.filter((link) => ["external", "affiliate"].includes(link.type)).length;
    return { internal, external };
  }, [links]);

  const anchorWords = useMemo(() => {
    return links.reduce((acc, link) => {
      const words = (link.text || "").trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [links]);

  const anchorDensity = wordCount ? (anchorWords / wordCount) * 100 : 0;
  const badAffiliate = links.filter((link) => link.type === "affiliate" && !(link.rel || "").includes("sponsored"));
  const badExternal = links.filter((link) => link.type === "external" && link.target !== "_blank");
  const internalRatioOk = linkStats.external === 0 || linkStats.internal / linkStats.external >= 3;

  const eeatChecks = [
    { label: "Especialista preenchido", ok: Boolean(meta.expertName && meta.expertRole) },
    { label: "Credenciais preenchidas", ok: Boolean(meta.expertCredentials) },
    { label: "Bio do especialista", ok: Boolean(meta.expertBio) },
    { label: "Fontes citadas", ok: meta.sources.length > 0 },
    { label: "Revisao informada", ok: meta.status !== "published" || Boolean(meta.reviewedAt) },
    { label: "Disclaimer presente", ok: Boolean(meta.disclaimer) },
  ];

  const serpTitle = meta.metaTitle || meta.title || "Titulo do post";
  const serpDesc = meta.metaDescription || "Resumo do post aparece aqui.";
  const serpUrl = meta.canonicalPath || `/${meta.slug || "slug"}`;

  return (
    <aside className="flex h-full w-[360px] flex-col border-l border-zinc-200 bg-white">
      <div className="flex border-b border-zinc-200 text-[11px] font-semibold uppercase text-zinc-500">
        <TabButton label="Config" active={tab === "config"} onClick={() => setTab("config")} icon={<Settings size={12} />} />
        <TabButton label="SEO" active={tab === "seo"} onClick={() => setTab("seo")} icon={<SlidersHorizontal size={12} />} />
        <TabButton label="Midia" active={tab === "media"} onClick={() => setTab("media")} icon={<ImageIcon size={12} />} />
        <TabButton label="Guardiao" active={tab === "guardian"} onClick={() => setTab("guardian")} icon={<ShieldCheck size={12} />} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {tab === "config" ? (
          <div className="space-y-4 text-xs text-zinc-700">
            <Field label="Slug" helper={slugStatus === "checking" ? "Checando..." : slugStatus === "taken" ? "Em uso" : slugStatus === "ok" ? "Disponivel" : ""}>
              <input
                value={meta.slug}
                onChange={(event) => setMeta({ slug: event.target.value })}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Silo">
              <select
                value={meta.siloId}
                onChange={(event) => setMeta({ siloId: event.target.value })}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              >
                <option value="">Sem silo</option>
                {silos.map((silo) => (
                  <option key={silo.id} value={silo.id}>
                    {silo.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Status">
                <select
                  value={meta.status}
                  onChange={(event) => setMeta({ status: event.target.value as EditorMeta["status"] })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                >
                  <option value="draft">Rascunho</option>
                  <option value="review">Revisao</option>
                  <option value="scheduled">Agendado</option>
                  <option value="published">Publicado</option>
                </select>
              </Field>
              <Field label="Agendar">
                <input
                  type="datetime-local"
                  value={meta.scheduledAt}
                  onChange={(event) => setMeta({ scheduledAt: event.target.value })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>

            <Field label="Canonical path">
              <input
                value={meta.canonicalPath}
                onChange={(event) => setMeta({ canonicalPath: event.target.value })}
                placeholder="/silo/slug"
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Especialista">
                <input
                  value={meta.expertName}
                  onChange={(event) => setMeta({ expertName: event.target.value })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Papel">
                <input
                  value={meta.expertRole}
                  onChange={(event) => setMeta({ expertRole: event.target.value })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>
            <Field label="Credenciais">
              <input
                value={meta.expertCredentials}
                onChange={(event) => setMeta({ expertCredentials: event.target.value })}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <Field label="Bio do especialista">
              <textarea
                rows={3}
                value={meta.expertBio}
                onChange={(event) => setMeta({ expertBio: event.target.value })}
                className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Revisado por">
                <input
                  value={meta.reviewedBy}
                  onChange={(event) => setMeta({ reviewedBy: event.target.value })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Data da revisao">
                <input
                  type="datetime-local"
                  value={meta.reviewedAt}
                  onChange={(event) => setMeta({ reviewedAt: event.target.value })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>
            <Field label="Disclaimer">
              <textarea
                rows={2}
                value={meta.disclaimer}
                onChange={(event) => setMeta({ disclaimer: event.target.value })}
                className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500">
                <span>Fontes</span>
                <button
                  type="button"
                  onClick={() => setMeta({ sources: [...meta.sources, { label: "", url: "" }] })}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-[11px]"
                >
                  Adicionar
                </button>
              </div>
              {meta.sources.length === 0 ? (
                <p className="text-[11px] text-zinc-400">Nenhuma fonte.</p>
              ) : (
                meta.sources.map((source, index) => (
                  <div key={`${source.url}-${index}`} className="space-y-1 rounded-md border border-zinc-200 bg-zinc-50 p-2">
                    <input
                      value={source.label}
                      onChange={(event) => {
                        const next = [...meta.sources];
                        next[index] = { ...next[index], label: event.target.value };
                        setMeta({ sources: next });
                      }}
                      placeholder="Titulo da fonte"
                      className="w-full rounded-md border border-zinc-200 px-2 py-1 text-[11px] outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        value={source.url}
                        onChange={(event) => {
                          const next = [...meta.sources];
                          next[index] = { ...next[index], url: event.target.value };
                          setMeta({ sources: next });
                        }}
                        placeholder="https://"
                        className="w-full rounded-md border border-zinc-200 px-2 py-1 text-[11px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMeta({ sources: meta.sources.filter((_, i) => i !== index) })}
                        className="rounded-md border border-zinc-200 px-2 text-[11px]"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="space-y-4 text-xs text-zinc-700">
            <Field label="Target keyword">
              <input
                value={meta.targetKeyword}
                onChange={(event) => setMeta({ targetKeyword: event.target.value })}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field
                label="Meta title"
                helper={<span className={counterTone(meta.metaTitle.length, 30, 60)}>{meta.metaTitle.length}/60</span>}
              >
                <input
                  value={meta.metaTitle}
                  onChange={(event) => setMeta({ metaTitle: event.target.value })}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field
                label="Meta description"
                helper={<span className={counterTone(meta.metaDescription.length, 150, 170)}>{meta.metaDescription.length}/170</span>}
              >
                <textarea
                  rows={3}
                  value={meta.metaDescription}
                  onChange={(event) => setMeta({ metaDescription: event.target.value })}
                  className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>

            <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">SERP Preview</p>
              <div className="space-y-1">
                <p className="text-[11px] text-zinc-500">{serpUrl}</p>
                <p className="truncate text-sm font-semibold text-blue-700">{serpTitle}</p>
                <p className="text-[13px] text-zinc-600 line-clamp-2">{serpDesc}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">KGR & Checks</p>
              <CheckRow label="Keyword no 1o paragrafo" ok={keywordInFirst} />
              <CheckRow label="Keyword no H1" ok={keywordInH1} />
              <CheckRow label="Slug contem keyword" ok={keywordInSlug} />
              <CheckRow label="H1 = Title = URL" ok={exactMatch} />
              <div className="flex items-center justify-between">
                <span>Densidade keyword</span>
                <span className={counterTone(density, 0.5, 2.5)}>{density.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Headings com keyword</span>
                <span>
                  {headingStats.keywordHits}/{headingStats.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Palavras</span>
                <span>{wordCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tempo de leitura</span>
                <span className="inline-flex items-center gap-1 text-zinc-600">
                  <Clock size={12} />
                  {readingTime} min
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500">
                <span>Supporting</span>
                <span className="text-[10px] text-zinc-400">usadas</span>
              </div>
              {supportingStats.length === 0 ? (
                <p className="text-[11px] text-zinc-400">Nenhuma supporting keyword.</p>
              ) : (
                supportingStats.map((item) => (
                  <div key={item.term} className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-[12px] text-zinc-600">
                    <span>{item.term}</span>
                    <span className={item.count > 0 ? "text-emerald-600" : "text-amber-600"}>{item.count}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500">
                <span>Entidades</span>
                <span className="text-[10px] text-zinc-400">usadas</span>
              </div>
              {entityStats.length === 0 ? (
                <p className="text-[11px] text-zinc-400">Nenhuma entidade configurada.</p>
              ) : (
                entityStats.map((item) => (
                  <div key={item.term} className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-[12px] text-zinc-600">
                    <span>{item.term}</span>
                    <span className={item.count > 0 ? "text-emerald-600" : "text-amber-600"}>{item.count > 0 ? "OK" : "Falta"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {tab === "media" ? (
          <div className="space-y-4 text-xs text-zinc-700">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Avisos</p>
              <div className="mt-2 space-y-2">
                {!meta.heroImageUrl ? (
                  <Warning label="Hero image ausente" />
                ) : null}
                {!meta.heroImageAlt ? (
                  <Warning label="Alt da capa vazio" />
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {meta.images.length === 0 ? (
                <div className="col-span-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-400">
                  Biblioteca vazia. Envie imagens para o post.
                </div>
              ) : (
                meta.images.map((image) => (
                  <div key={image.url} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                    <div className="aspect-square w-full overflow-hidden rounded-md bg-white">
                      {image.url ? (
                        <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-300">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                    <input
                      value={image.alt}
                      onChange={(event) => onUpdateImageAlt(image.url, event.target.value)}
                      className="mt-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-[11px] outline-none"
                      placeholder="Alt text"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onInsertImage(image)}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] hover:bg-white"
                      >
                        Inserir
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(image.url)}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] hover:bg-white"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {tab === "guardian" ? (
          <div className="space-y-4 text-xs text-zinc-700">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500">
                <span>Mapa de links</span>
                <span className="text-[10px] text-zinc-400">
                  {linkStats.internal} int / {linkStats.external} ext
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {links.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">Nenhum link encontrado.</p>
                ) : (
                  links.map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => onSelectLink(link)}
                      className="flex w-full items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-left text-[12px] text-zinc-600 hover:bg-white"
                    >
                      <Link2 size={12} className="mt-0.5 text-zinc-400" />
                      <div className="flex-1">
                        <p className="truncate font-medium text-zinc-700">{link.text || link.href}</p>
                        <p className="truncate text-[10px] text-zinc-400">{link.href}</p>
                      </div>
                      <span className="text-[10px] text-zinc-400">{link.type}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Regras</p>
              <div className="mt-2 space-y-2">
                <RuleRow label="Densidade de ancora" value={`${anchorDensity.toFixed(1)}%`} tone={anchorDensity > 4 ? "error" : anchorDensity > 3 ? "warn" : "ok"} />
                <RuleRow label="Regra 3 internos : 1 externo" value={internalRatioOk ? "OK" : "Ajustar"} tone={internalRatioOk ? "ok" : "warn"} />
                {badAffiliate.length > 0 ? <Warning label="Links afiliados sem sponsored" /> : null}
                {badExternal.length > 0 ? <Warning label="Links externos sem target _blank" /> : null}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">E-E-A-T</p>
              <div className="mt-2 space-y-2">
                {eeatChecks.map((item) => (
                  <CheckRow key={item.label} label={item.label} ok={item.ok} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, helper, children }: { label: string; helper?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500">
        <span>{label}</span>
        {helper}
      </div>
      {children}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-3 ${
        active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {ok ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
    </div>
  );
}

function Warning({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-amber-600">
      <AlertTriangle size={12} />
      <span>{label}</span>
    </div>
  );
}

function RuleRow({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "error" }) {
  const color = tone === "error" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
