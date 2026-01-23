import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetSiloBySlug, adminListBatchPosts } from "@/lib/db";

export const revalidate = 0;

export default async function BatchPage({ params }: { params: Promise<{ slug: string; batchId: string }> }) {
  const { slug, batchId } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) return notFound();

  const items = await adminListBatchPosts(batchId);
  if (!items.length) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <p className="text-sm text-[color:var(--muted)]">Pacote vazio ou inexistente.</p>
        <Link href={`/admin/silos/${slug}/batch/new`} className="text-sm text-[color:var(--brand-hot)] underline">
          Criar novo pacote
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <p className="text-xs text-[color:var(--muted-2)]">Guardian do Silo</p>
        <h1 className="mt-2 text-2xl font-semibold">Pacote do silo {silo.name}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Posts prontos para edição e varredura.</p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[color:var(--surface-muted)] text-xs text-[color:var(--muted-2)]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const post = item.post;
              const status = post?.status ?? (post?.published ? "published" : "draft");
              return (
                <tr key={item.post_id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3 text-[color:var(--muted-2)]">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{post?.title ?? "Post"}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">{post?.slug}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">{status}</td>
                  <td className="px-4 py-3">
                    {post ? (
                      <Link
                        href={`/admin/editor/${post.id}`}
                        className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-1.5 text-xs hover:bg-[color:var(--brand-primary)]"
                      >
                        Abrir editor
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/silos/${slug}/links`}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
        >
          Dashboard do silo
        </Link>
        <Link
          href={`/admin/silos/${slug}/batch/new`}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
        >
          Novo pacote
        </Link>
      </div>
    </div>
  );
}
