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
          <h1 className="text-xl font-semibold text-zinc-900">Silos (Pilares)</h1>
          <p className="text-sm text-zinc-500">Gerencie os hubs que alimentam os posts.</p>
        </div>
        <Link
          href="/admin/new"
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Novo post
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[12px] uppercase tracking-wide text-zinc-500">
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
              <tr key={silo.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-800">{silo.name}</td>
                <td className="px-4 py-3 text-zinc-600">{silo.slug}</td>
                <td className="px-4 py-3 text-zinc-600">{silo.menu_order ?? 0}</td>
                <td className="px-4 py-3 text-zinc-600">{silo.is_active ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/silos/${silo.id}`}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {silos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-center text-zinc-500">
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
