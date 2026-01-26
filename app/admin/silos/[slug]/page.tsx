import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug } from "@/lib/db";
import { updateSiloAction } from "@/app/admin/silos/actions";

export const revalidate = 0;

export default async function EditSiloPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--text)]">Editar Silo</h1>
          <p className="text-sm text-[color:var(--muted-2)]">Atualize metadados e conteÃºdo do pilar.</p>
        </div>
        <Link
          href="/admin/silos"
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)]"
        >
          Voltar
        </Link>
      </div>

      <form action={updateSiloAction} className="space-y-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <input type="hidden" name="id" value={silo.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <input
              name="name"
              defaultValue={silo.name}
              required
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              defaultValue={silo.slug}
              readOnly
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--muted-2)] outline-none"
            />
          </Field>
        </div>

        <Field label="DescriÃ§Ã£o">
          <textarea
            name="description"
            defaultValue={silo.description ?? ""}
            rows={2}
            className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Meta title">
            <input
              name="meta_title"
              defaultValue={silo.meta_title ?? ""}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Meta description">
            <input
              name="meta_description"
              defaultValue={silo.meta_description ?? ""}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hero image URL">
            <input
              name="hero_image_url"
              defaultValue={silo.hero_image_url ?? ""}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Hero alt">
            <input
              name="hero_image_alt"
              defaultValue={silo.hero_image_alt ?? ""}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            />
          </Field>
        </div>

        <Field label="ConteÃºdo do pilar (HTML ou markdown simples)">
          <textarea
            name="pillar_content_html"
            defaultValue={silo.pillar_content_html ?? ""}
            rows={6}
            className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            placeholder="ConteÃºdo opcional do pilar"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Menu order">
            <input
              name="menu_order"
              type="number"
              defaultValue={silo.menu_order ?? 0}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Ativo">
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked={silo.is_active ?? true}
                className="h-4 w-4 rounded border-[color:var(--border-strong)]"
              />
              <label htmlFor="is_active">Listar na navegaÃ§Ã£o pÃºblica</label>
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-[color:var(--brand-hot)] px-4 py-2 text-sm font-semibold text-[color:var(--paper)] hover:bg-[color:var(--brand-accent)]"
          >
            Salvar silo
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[11px] font-semibold uppercase text-[color:var(--muted-2)]">{label}</span>
      {children}
    </label>
  );
}

