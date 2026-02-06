import { NextRequest, NextResponse } from "next/server";
import { adminGetSiloPost } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
    try {
        await requireAdminSession();

        const { searchParams } = new URL(request.url);
        const siloId = searchParams.get("siloId");
        const postId = searchParams.get("postId");

        if (!siloId) {
            return NextResponse.json({ error: "siloId required" }, { status: 400 });
        }

        if (!postId) {
            const supabase = getAdminSupabase();
            const { data: siloData, error: siloError } = await supabase
                .from("silos")
                .select("slug")
                .eq("id", siloId)
                .maybeSingle();

            if (siloError) {
                return NextResponse.json({ error: "Failed to load silo" }, { status: 500 });
            }

            const { data: posts, error: postsError } = await supabase
                .from("posts")
                .select("id, title, slug")
                .eq("silo_id", siloId);

            if (postsError) {
                return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
            }

            const { data: hierarchy, error: hierarchyError } = await supabase
                .from("silo_posts")
                .select("post_id, role, position")
                .eq("silo_id", siloId);

            if (hierarchyError) {
                return NextResponse.json({ error: "Failed to load hierarchy" }, { status: 500 });
            }

            const hierarchyMap = new Map((hierarchy || []).map((item) => [item.post_id, item]));

            const items = (posts || []).map((post) => {
                const info = hierarchyMap.get(post.id) as any;
                return {
                    id: post.id,
                    title: post.title,
                    slug: post.slug,
                    role: info?.role ?? null,
                    position: info?.position ?? null,
                    siloSlug: siloData?.slug ?? null,
                };
            });

            return NextResponse.json({ items });
        }

        const siloPost = await adminGetSiloPost(siloId, postId);

        if (!siloPost) {
            return NextResponse.json({ role: null, position: null });
        }

        return NextResponse.json({
            role: siloPost.role,
            position: siloPost.position,
        });
    } catch (error) {
        console.error("Error loading silo hierarchy:", error);
        return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }
}
