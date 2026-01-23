import Link from "next/link";
import { adminListSilos } from "@/lib/db";
import { createSilo } from "@/app/admin/actions";
import { NewPostForm } from "@/components/admin/NewPostForm";
import { requireAdminSession } from "@/lib/admin/auth";

export const revalidate = 0;

export default async function NewPostPage() {
  await requireAdminSession();
  const silos = await adminListSilos();

  if (silos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
          <p className="text-xs text-[color:var(--muted-2)]">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold">Sem silos</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Crie um silo antes de abrir o editor.
          </p>
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
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Preencha os dados essenciais para criar um rascunho.
        </p>
      </header>

      <NewPostForm silos={silos} />

      <Link
        href="/admin"
        className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
      >
        Voltar
      </Link>
    </div>
  );
}
