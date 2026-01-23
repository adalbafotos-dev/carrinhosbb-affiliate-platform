"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Globe2, Info, ShieldCheck, UserRound } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";

type Tab = "seo" | "eeat" | "publish";

const AUTHORS = ["Equipe", "Ana Ferreira", "Lucas Prado", "Marina Ramos"];

function counterTone(count: number, min: number, max: number) {
  if (count === 0) return "text-zinc-500";
  if (count < min || count > max) return "text-amber-400";
  return "text-emerald-400";
}

export function EditorInspector() {
  const { meta, setMeta, slugStatus, silos, lastSavedAt, saving, onSave } = useEditorContext();
  const [tab, setTab] = useState<Tab>("seo");

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

  return (
    <aside className="flex h-full w-[380px] flex-col border-l border-zinc-900 bg-zinc-900">
      <div className="flex border-b border-zinc-900 text-[11px] font-semibold uppercase text-zinc-400">
        <TabButton label="SEO / KGR" active={tab === "seo"} onClick={() => setTab("seo")} />
        <TabButton label="E-E-A-T" active={tab === "eeat"} onClick={() => setTab("eeat")} />
        <TabButton label="Publicar" active={tab === "publish"} onClick={() => setTab("publish")} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs text-zinc-100">
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
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Focus keyword">
              <input
                value={meta.targetKeyword}
                onChange={(event) => setMeta({ targetKeyword: event.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="SEO title" helper={<span className={counterTone(seoTitleCount, 30, 60)}>{seoTitleCount}/60</span>}>
              <input
                value={meta.metaTitle}
                onChange={(event) => setMeta({ metaTitle: event.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
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
                className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Supporting keywords (1 por linha)">
              <textarea
                rows={3}
                value={meta.supportingKeywords.join("\n")}
                onChange={(event) =>
                  setMeta({ supportingKeywords: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })
                }
                className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Entidades / LSI (1 por linha)">
              <textarea
                rows={3}
                value={meta.entities.join("\n")}
                onChange={(event) => setMeta({ entities: event.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}
                className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
              <p className="flex items-center gap-2 font-semibold uppercase text-zinc-300">
                <Globe2 size={12} /> Preview
              </p>
              <p className="mt-2 text-[11px] text-emerald-300">/{meta.slug || "slug"}</p>
              <p className="truncate text-sm font-semibold text-emerald-100">{meta.metaTitle || meta.title || "Título"}</p>
              <p className="text-[12px] text-zinc-300 line-clamp-2">{meta.metaDescription || "Resumo do post"}</p>
            </div>
          </div>
        ) : null}

        {tab === "eeat" ? (
          <div className="space-y-4">
            <Field label="Autor (placeholder)">
              <select
                value={meta.authorName}
                onChange={(event) => setMeta({ authorName: event.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
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
                className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
                placeholder="https://linkedin.com/..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Revisado por">
                <input
                  value={meta.reviewedBy}
                  onChange={(event) => setMeta({ reviewedBy: event.target.value })}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Data da revisão">
                <input
                  type="datetime-local"
                  value={meta.reviewedAt}
                  onChange={(event) => setMeta({ reviewedAt: event.target.value })}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>

            <Field label="Disclaimer">
              <textarea
                rows={2}
                value={meta.disclaimer}
                onChange={(event) => setMeta({ disclaimer: event.target.value })}
                className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
              <p className="flex items-center gap-2 font-semibold uppercase text-zinc-300">
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
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              >
                <option value="draft">Rascunho</option>
                <option value="review">Revisão</option>
                <option value="published">Publicado</option>
              </select>
            </Field>

            <Field label="Silo">
              <select
                value={meta.siloId}
                onChange={(event) => setMeta({ siloId: event.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              >
                <option value="">Sem silo</option>
                {silos.map((silo) => (
                  <option key={silo.id} value={silo.id}>
                    {silo.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Agendamento (opcional)">
              <input
                type="datetime-local"
                value={meta.scheduledAt}
                onChange={(event) => setMeta({ scheduledAt: event.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <Field label="Canonical">
              <input
                value={meta.canonicalPath}
                onChange={(event) => setMeta({ canonicalPath: event.target.value })}
                placeholder="/silo/slug"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none"
              />
            </Field>

            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-300">
              <p className="flex items-center gap-2 font-semibold uppercase text-zinc-300">
                <Info size={12} /> Status
              </p>
              <p className="mt-2 flex items-center gap-2 text-zinc-400">
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

function Field({ label, helper, children }: { label: string; helper?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-400">
        <span>{label}</span>
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
      className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-3 ${
        active ? "border-emerald-500 text-emerald-200" : "border-transparent text-zinc-500"
      }`}
    >
      {label}
    </button>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {ok ? <CheckCircle2 size={12} className="text-emerald-400" /> : <UserRound size={12} className="text-zinc-500" />}
      <span className={ok ? "text-zinc-200" : "text-zinc-500"}>{label}</span>
    </div>
  );
}
