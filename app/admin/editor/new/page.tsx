import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminCreateDraftPost, adminListSilos, detectMissingPostColumns } from "@/lib/db";

export const revalidate = 0;

export default async function NewEditorPage() {
  await requireAdminSession();
  const missing = await detectMissingPostColumns();
  if (missing.length) {
    throw new Error(
      `Colunas ausentes em posts: ${missing.join(
        ", "
      )}. Rode a migration supabase/migrations/20260122_01_add_post_editor_fields.sql e depois NOTIFY pgrst, 'reload schema';`
    );
  }

  const silos = await adminListSilos();
  const siloId = silos[0]?.id ?? null;
  const slug = `draft-${Date.now().toString(36)}`;

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

    redirect(`/admin/editor/${post.id}`);
  } catch (error: any) {
    const message =
      typeof error?.message === "string" && error.message.includes("column")
        ? `${error.message} - aplique a migration supabase/migrations/20260122_01_add_post_editor_fields.sql e rode NOTIFY pgrst, 'reload schema';`
        : "Falha ao criar rascunho. Confirme se as migrations do Supabase foram aplicadas.";
    throw new Error(message);
  }
}

