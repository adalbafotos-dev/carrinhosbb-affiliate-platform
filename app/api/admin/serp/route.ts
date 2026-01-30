import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";

type SerpResult = {
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
};

type SerpAnalysis = {
    results: SerpResult[];
    anomalies: string[];
    intents: {
        ecommerce: number;
        informational: number;
        mixed: number;
    };
};

export async function POST(request: NextRequest) {
    try {
        await requireAdminSession();

        const { keyword } = await request.json();

        if (!keyword || typeof keyword !== "string") {
            return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
        }

        // Buscar credenciais do Google Custom Search
        // TODO: Implementar busca no Supabase ou env
        const apiKey = process.env.GOOGLE_CSE_API_KEY;
        const cx = process.env.GOOGLE_CSE_CX;

        if (!apiKey || !cx) {
            return NextResponse.json(
                { error: "Google Custom Search API não configurada. Configure GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX no .env" },
                { status: 500 }
            );
        }

        // Chamar Google Custom Search JSON API
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(keyword)}&num=10`;

        const response = await fetch(searchUrl);

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { error: "Erro na API do Google", details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Processar resultados
        const results: SerpResult[] = (data.items || []).map((item: any) => ({
            title: item.title || "",
            link: item.link || "",
            snippet: item.snippet || "",
            displayLink: item.displayLink || ""
        }));

        // Detectar anomalias (heurística simples)
        const anomalies: string[] = [];
        const intents = {
            ecommerce: 0,
            informational: 0,
            mixed: 0
        };

        // Keywords indicando e-commerce
        const ecommerceKeywords = ["comprar", "preço", "frete", "loja", "marketplace", "amazon", "mercado livre", "shopee"];
        // Keywords indicando forum/video
        const forumVideoKeywords = ["youtube", "reddit", "forum", "quora", "vídeo"];

        let ecommerceCount = 0;
        let forumVideoCount = 0;
        const domainCount: Record<string, number> = {};

        for (const result of results) {
            const textLower = (result.title + " " + result.snippet).toLowerCase();

            // Intenção e-commerce
            if (ecommerceKeywords.some(kw => textLower.includes(kw))) {
                ecommerceCount++;
            }

            // Intenção forum/vídeo
            if (forumVideoKeywords.some(kw => textLower.includes(kw) || result.link.includes(kw))) {
                forumVideoCount++;
            }

            // Domínios repetidos
            const domain = result.displayLink;
            domainCount[domain] = (domainCount[domain] || 0) + 1;
        }

        // Análise de intenção
        const totalResults = results.length;
        if (totalResults > 0) {
            intents.ecommerce = Math.round((ecommerceCount / totalResults) * 100);
            intents.informational = Math.round(((totalResults - ecommerceCount - forumVideoCount) / totalResults) * 100);
            intents.mixed = forumVideoCount > 0 ? Math.round((forumVideoCount / totalResults) * 100) : 0;
        }

        // Gerar alertas
        if (intents.ecommerce > 50) {
            anomalies.push("⚠️ SERP dominada por e-commerce (>50%). Seu conteúdo informativo pode ter dificuldade para ranquear.");
        }

        if (intents.mixed > 30) {
            anomalies.push("📹 SERP mista detectada (vídeos/fóruns >30%). Considere adicionar vídeo ou formatos interativos.");
        }

        // Domínio repetido >= 3 vezes
        const repeatedDomains = Object.entries(domainCount).filter(([_, count]) => count >= 3);
        if (repeatedDomains.length > 0) {
            anomalies.push(`🏢 SERP concentrada: ${repeatedDomains.map(([d]) => d).join(", ")} aparece(m) 3+ vezes.`);
        }

        if (results.length < 10) {
            anomalies.push(`📉 Poucos resultados retornados (${results.length}). Keyword pode ter baixo volume.`);
        }

        const analysis: SerpAnalysis = {
            results,
            anomalies,
            intents
        };

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error("Erro no SERP Analyzer:", error);
        return NextResponse.json(
            { error: "Erro interno", message: error.message },
            { status: 500 }
        );
    }
}
