import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetPostById, adminListPosts, adminListSilos } from "@/lib/db";
import { AdvancedEditor } from "@/components/editor/AdvancedEditor";

export const revalidate = 0;

export default async function EditorRootPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (id) {
    const [post, silos] = await Promise.all([adminGetPostById(id), adminListSilos()]);
    if (!post) return notFound();
    return <AdvancedEditor post={post} silos={silos} />;
  }

  const posts = await adminListPosts();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-3xl border border-zinc-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Editor</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Escolha um post</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Abra um rascunho para editar ou crie um novo post.
        </p>
      </header>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6">
        {posts.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum post encontrado.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/editor?id=${post.id}`}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-semibold">{post.title}</p>
                  <p className="text-xs text-zinc-500">{post.silo?.name ?? "Sem silo"}</p>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {post.published ? "Publicado" : "Rascunho"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/admin/editor/new"
        className="inline-flex rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
      >
        Criar novo post
      </Link>
    </div>
  );
}
