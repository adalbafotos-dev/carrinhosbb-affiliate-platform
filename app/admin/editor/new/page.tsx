import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminCreateDraftPost, adminListSilos, detectMissingPostColumns } from "@/lib/db";

export const revalidate = 0;
const MIGRATION_PATH = "supabase/migrations/20260122_01_add_post_editor_fields.sql";
const IS_PROD = process.env.NODE_ENV === "production";

function DevCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full justify-center p-8">
      <div className="w-full max-w-3xl space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">{badge}</p>
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatErrorDetails(error: any) {
  const lines = [
    error?.message ? `message: ${error.message}` : null,
    error?.details ? `details: ${error.details}` : null,
    error?.hint ? `hint: ${error.hint}` : null,
    error?.code ? `code: ${error.code}` : null,
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : "Sem detalhes do erro. Verifique o console do servidor.";
}

export default async function NewEditorPage() {
  await requireAdminSession();
  const missing = await detectMissingPostColumns();
  if (missing.length) {
    const strictMessage = `Colunas ausentes em posts: ${missing.join(
      ", "
    )}. Rode a migration ${MIGRATION_PATH} e depois NOTIFY pgrst, 'reload schema';`;

    if (IS_PROD) {
      throw new Error(strictMessage);
    }

    return (
      <DevCard title="Atualize o schema do Supabase" badge="Database not migrated">
        <p className="text-sm text-zinc-200">
          O editor precisa de algumas colunas novas em <code className="text-orange-200">public.posts</code>. Rode a
          migration de sincronizacao e recarregue esta tela.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Colunas faltando</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((col) => (
              <span key={col} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-white">
                {col}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">SQL para aplicar</p>
          <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
{`-- Cole o conteudo do arquivo abaixo no SQL Editor:
-- ${MIGRATION_PATH}
-- Depois force o recarregamento do PostgREST:
NOTIFY pgrst, 'reload schema';`}
          </pre>
        </div>

        <p className="text-xs text-zinc-400">Depois de aplicar a migration, recarregue esta pagina.</p>
      </DevCard>
    );
  }

  const silos = await adminListSilos();
  const siloId = silos[0]?.id ?? null;
  const slug = `draft-${Date.now().toString(36)}`;

  let postId: string | null = null;
  try {
    const post = await adminCreateDraftPost({
      silo_id: siloId ?? undefined,
      title: "Novo post",
      slug,
      target_keyword: "keyword base",
      supporting_keywords: [],
      meta_description: null,
      entities: [],
    });
    postId = post.id;
  } catch (error: any) {
    console.error("Falha ao criar rascunho", error);

    if (!IS_PROD) {
      return (
        <DevCard title="Falha ao criar rascunho" badge="Draft error">
          <p className="text-sm text-zinc-200">
            Verifique as credenciais do Supabase, politicas RLS e se as migrations foram aplicadas.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Detalhes</p>
            <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">{formatErrorDetails(error)}</pre>
          </div>
          <p className="text-xs text-zinc-400">
            Se o erro indicar schema desatualizado, aplique {MIGRATION_PATH} e rode NOTIFY pgrst.
          </p>
        </DevCard>
      );
    }

    const message =
      typeof error?.message === "string" && error.message.includes("column")
        ? `${error.message} - aplique a migration ${MIGRATION_PATH} e rode NOTIFY pgrst, 'reload schema';`
        : "Falha ao criar rascunho. Confirme se as migrations do Supabase foram aplicadas.";
    throw new Error(message);
  }

  if (!postId) {
    throw new Error("Falha ao criar rascunho. ID nao retornado pelo Supabase.");
  }

  redirect(`/admin/editor/${postId}`);
}

