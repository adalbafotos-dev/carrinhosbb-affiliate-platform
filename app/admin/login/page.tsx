import { redirect } from "next/navigation";
import { isAdminAuthDisabled } from "@/lib/admin/settings";

export const revalidate = 0;

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (isAdminAuthDisabled()) {
    redirect("/admin");
  }

  const { next } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <p className="text-xs text-[color:var(--muted-2)]">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Entre com a senha para acessar o painel.</p>
      </header>

      <form method="post" action="/api/admin/login" className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8 space-y-4">
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <div className="space-y-2">
          <label className="text-xs text-[color:var(--muted-2)]" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            placeholder="Digite a senha do admin"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-semibold hover:bg-[color:var(--brand-primary)]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

