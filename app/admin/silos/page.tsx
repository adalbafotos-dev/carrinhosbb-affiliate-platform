import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminListSilos } from "@/lib/db";

export const revalidate = 0;

export default async function AdminSilosPage() {
  await requireAdminSession();
  const silos = await adminListSilos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--text)]">Silos (Pilares)</h1>
          <p className="text-sm text-[color:var(--muted-2)]">Gerencie os hubs que alimentam os posts.</p>
        </div>
        <Link
          href="/admin/editor/new"
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]"
        >
          Novo post
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)] text-left text-[12px] uppercase tracking-wide text-[color:var(--muted-2)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Menu</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3">AÃ§Ãµes</th>
            </tr>
          </thead>
          <tbody>
            {silos.map((silo) => (
              <tr key={silo.id} className="border-b border-[color:var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium text-[color:var(--text)]">{silo.name}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{silo.slug}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{silo.menu_order ?? 0}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{silo.is_active ? "Sim" : "NÃ£o"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/silos/${silo.slug}`}
                    className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {silos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-center text-[color:var(--muted-2)]">
                  Nenhum silo encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

