import { adminGetPostById } from "@/lib/db";
import { notFound } from "next/navigation";
import { AdvancedEditor } from "@/components/editor/AdvancedEditor";

export const revalidate = 0;

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await adminGetPostById(id);

  if (!post) return notFound();

  return <AdvancedEditor post={post} />;
}
