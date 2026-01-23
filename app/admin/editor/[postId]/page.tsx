import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetPostById, adminListSilos } from "@/lib/db";
import { AdvancedEditor } from "@/components/editor/AdvancedEditor";

export const revalidate = 0;

export default async function EditorPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireAdminSession();
  const { postId } = await params;
  const [post, silos] = await Promise.all([adminGetPostById(postId), adminListSilos()]);

  if (!post) return notFound();

  return <AdvancedEditor post={post} silos={silos} />;
}
