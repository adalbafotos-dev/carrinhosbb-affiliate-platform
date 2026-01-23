import { adminGetPostById, adminListSilos } from "@/lib/db";
import { notFound } from "next/navigation";
import { AdvancedEditor } from "@/components/editor/AdvancedEditor";

export const revalidate = 0;

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, silos] = await Promise.all([adminGetPostById(id), adminListSilos()]);

  if (!post) return notFound();

  return <AdvancedEditor post={post} silos={silos} />;
}
