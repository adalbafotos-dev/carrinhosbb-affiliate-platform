import Link from "next/link";
import { adminListSilos } from "@/lib/db";
import { createPost, createSilo } from "@/app/admin/actions";

export const revalidate = 0;

export default async function NewPostPage() {
  const silos = await adminListSilos();

  if (silos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
          <p className="text-xs text-[color:var(--muted-2)]">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold">Sem silos</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Rode o seed para criar silos antes de abrir o editor.</p>
        </header>
        <form
          action={createSilo}
          className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8 space-y-4"
        >
          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="name">
              Nome do silo
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
              placeholder="Ex: Equipamentos"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
              placeholder="equipamentos"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="description">
              Descricao (opcional)
            </label>
            <textarea
              id="description"
              name="description"
              className="h-24 w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold hover:bg-[color:var(--brand-primary)]"
          >
            Criar silo
          </button>
        </form>
        <Link
          href="/admin"
          className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <p className="text-xs text-[color:var(--muted-2)]">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Novo post</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Preencha os dados minimos para criar um rascunho.</p>
      </header>

      <form action={createPost} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="silo_id">
              Silo
            </label>
            <select
              id="silo_id"
              name="silo_id"
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            >
              <option value="">Selecione</option>
              {silos.map((silo) => (
                <option key={silo.id} value={silo.id}>
                  {silo.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="title">
              Titulo (H1)
            </label>
            <input
              id="title"
              name="title"
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
              placeholder="exemplo-de-slug"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="target_keyword">
              Target keyword
            </label>
            <input
              id="target_keyword"
              name="target_keyword"
              required
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="meta_description">
              Meta description (opcional)
            </label>
            <input
              id="meta_description"
              name="meta_description"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs text-[color:var(--muted-2)]" htmlFor="supporting_keywords">
              Supporting keywords (1 por linha)
            </label>
            <textarea
              id="supporting_keywords"
              name="supporting_keywords"
              className="h-28 w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold hover:bg-[color:var(--brand-primary)]"
          >
            Criar rascunho
          </button>

          <Link
            href="/admin"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
          >
            Voltar
          </Link>
        </div>
      </form>
    </div>
  );
}

