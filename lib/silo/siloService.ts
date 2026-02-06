import * as cheerio from "cheerio";
import crypto from "crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";

type LinkOccurrence = {
    silo_id: string;
    source_post_id: string;
    target_post_id: string | null;
    anchor_text: string;
    context_snippet: string | null;
    start_index?: number | null;
    end_index?: number | null;
    occurrence_key?: string | null;
    href_normalized: string;
    position_bucket: "START" | "MID" | "END";
    link_type: "INTERNAL" | "EXTERNAL" | "AFFILIATE";
    is_nofollow: boolean;
    is_sponsored: boolean;
    is_ugc: boolean;
    is_blank: boolean;
};

export async function syncLinkOccurrences(
    siloId: string,
    sourcePostId: string,
    htmlContent: string
) {
    if (!siloId || !sourcePostId || !htmlContent) return;

    const supabase = getAdminSupabase();

    // 1. Buscar posts para resolver links internos
    const { data: posts, error } = await supabase
        .from("posts")
        .select("id, slug")
        .eq("silo_id", siloId);

    if (error || !posts) {
        console.error("Erro ao buscar posts para syncLinkOccurrences", error);
        return;
    }

    const normalizeSlug = (s: string) => s.replace(/^\/+|\/+$/g, "").toLowerCase();
    const slugMap = new Map<string, string>();
    posts.forEach((p) => {
        if (p.slug) slugMap.set(normalizeSlug(p.slug), p.id);
    });

    // 2. Parsear HTML
    const $ = cheerio.load(htmlContent);
    const $links = $("a");
    const occurrences: LinkOccurrence[] = [];
    const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
    const fullText = normalizeText($.root().text());
    let searchCursor = 0;

    // Limite de processamento para evitar gargalos em posts gigantes
    const MAX_LINKS = 200;

    $links.slice(0, MAX_LINKS).each((i, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        let anchorText = $el.text().replace(/\s+/g, " ").trim();
        if (!anchorText && $el.find("img").length > 0) anchorText = "[Imagem]";
        if (!anchorText) anchorText = "[Sem texto]";

        if (!href) return;

        // Atributos
        const rel = ($el.attr("rel") || "").toLowerCase();
        const target = $el.attr("target") || "";
        const is_nofollow = rel.includes("nofollow");
        const is_sponsored = rel.includes("sponsored");
        const is_ugc = rel.includes("ugc");
        const is_blank = target === "_blank";

        // Classificação e Normalização
        let link_type: "INTERNAL" | "EXTERNAL" | "AFFILIATE" = "EXTERNAL";
        let targetPostId = null;
        let cleanHref = href.split(/[?#]/)[0];

        // Tentar identificar Interno
        // Se for relativo ou domínio próprio (assumindo relativo por enquanto)
        let normalizedTargetSlug = "";

        if (!cleanHref.startsWith("http")) {
            normalizedTargetSlug = normalizeSlug(cleanHref);
            targetPostId = slugMap.get(normalizedTargetSlug) || null;
            if (targetPostId) link_type = "INTERNAL";
        } else {
            // Heurística simples para Afiliado
            if (cleanHref.includes("amazon.") || cleanHref.includes("amzn.to") || cleanHref.includes("afiliado")) {
                link_type = "AFFILIATE";
            }
            // Tentar ver se é link absoluto para o próprio site? 
            // Ignorado por simplicidade, assumindo boas práticas de links relativos.
        }

        // Context Snippet
        const contextText = $el.parent().text().replace(/\s+/g, " ");
        const snippet = contextText.substring(0, 200);

        // Start/End index (approx by normalized full text)
        const anchorNorm = normalizeText(anchorText);
        let start_index: number | null = null;
        let end_index: number | null = null;
        if (anchorNorm) {
            const foundIndex = fullText.indexOf(anchorNorm, searchCursor);
            if (foundIndex >= 0) {
                start_index = foundIndex;
                end_index = foundIndex + anchorNorm.length;
                searchCursor = end_index;
            }
        }

        const occurrence_key = crypto
            .createHash("sha1")
            .update(`${anchorNorm}|${href}|${snippet}`)
            .digest("hex");

        // Position Bucket
        const bucket = i < $links.length / 3 ? "START" : i < ($links.length * 2) / 3 ? "MID" : "END";

        occurrences.push({
            silo_id: siloId,
            source_post_id: sourcePostId,
            target_post_id: targetPostId, // Pode ser null agora
            anchor_text: anchorText.substring(0, 255),
            context_snippet: snippet,
            start_index,
            end_index,
            occurrence_key,
            href_normalized: href.substring(0, 500),
            position_bucket: bucket,
            link_type,
            is_nofollow,
            is_sponsored,
            is_ugc,
            is_blank
        });
    });

    // 3. Persistir
    const { error: delError } = await supabase
        .from("post_link_occurrences")
        .delete()
        .eq("source_post_id", sourcePostId)
        .eq("silo_id", siloId);

    if (delError) {
        console.error("Erro ao limpar ocorrências antigas", delError);
        return;
    }

    if (occurrences.length > 0) {
        const { error: insError } = await supabase
            .from("post_link_occurrences")
            .insert(occurrences);

        if (insError) {
            console.error("Erro ao inserir novas ocorrências", insError);
        }
    }
}
