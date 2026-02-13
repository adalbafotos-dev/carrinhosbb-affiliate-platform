import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminListSilos } from "@/lib/db";

export const revalidate = 0;

export default async function AdminSilosPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  await requireAdminSession();
  const { deleted, error } = await searchParams;
  const silos = await adminListSilos();

  return (
    <div className="space-y-6">
      {deleted === "1" ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Silo excluido com sucesso.
        </div>
      ) : null}
      {error === "delete_failed" ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Falha ao excluir o silo.
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-(--text)">Silos (Pilares)</h1>
          <p className="text-sm text-(--muted-2)">Gerencie os hubs que alimentam os posts.</p>
        </div>
        <Link
          href="/admin/silos/new"
          className="rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm font-semibold text-(--text) hover:bg-(--surface-muted)"
        >
          Novo Silo
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--border) bg-(--surface)">
        <table className="min-w-full text-sm">
          <thead className="border-b border-(--border) bg-(--surface-muted) text-left text-[12px] uppercase tracking-wide text-(--muted-2)">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Menu</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {silos.map((silo) => (
              <tr key={silo.id} className="border-b border-(--border) last:border-0">
                <td className="px-4 py-3 font-medium text-(--text)">{silo.name}</td>
                <td className="px-4 py-3 text-(--muted)">{silo.slug}</td>
                <td className="px-4 py-3 text-(--muted)">{silo.menu_order ?? 0}</td>
                <td className="px-4 py-3 text-(--muted)">{silo.is_active ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/silos/${silo.slug}`}
                    className="rounded-md border border-(--border) px-3 py-1.5 text-[12px] font-semibold text-(--text) hover:bg-(--surface-muted)"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {silos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-center text-(--muted-2)">
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
