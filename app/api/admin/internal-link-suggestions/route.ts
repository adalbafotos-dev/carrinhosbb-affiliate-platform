import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/seo/rateLimit";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  postId: z.string().uuid().optional(),
  siloId: z.string().uuid().optional(),
  title: z.string().max(220).optional(),
  keyword: z.string().max(180).optional(),
  text: z.string().min(80).max(120_000),
  existingLinks: z
    .array(
      z.object({
        href: z.string().max(800).optional(),
        dataPostId: z.string().uuid().nullable().optional(),
        type: z.string().optional(),
      })
    )
    .max(400)
    .optional(),
  maxSuggestions: z.number().int().min(3).max(15).optional(),
});

const RATE_LIMIT = {
  limit: 25,
  windowMs: 10 * 60 * 1000,
};

type Candidate = {
  postId: string;
  title: string;
  slug: string;
  url: string;
  targetKeyword: string;
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
  semanticScore: number;
  hierarchyScore: number;
  keywordScore: number;
  finalScore: number;
  alreadyLinked: boolean;
};

function getClientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `internal-link-ai:${ip}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function stripHtml(value: string) {
  return value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(tokensA: string[], tokensB: string[]) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });

  const union = setA.size + setB.size - intersection;
  if (!union) return 0;
  return intersection / union;
}

function extractPath(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url, "http://internal.local");
    return parsed.pathname.replace(/\/+$/, "");
  } catch {
    return url.split(/[?#]/)[0].replace(/\/+$/, "");
  }
}

function roleBaseScore(role: Candidate["role"]) {
  if (role === "PILLAR") return 24;
  if (role === "SUPPORT") return 16;
  if (role === "AUX") return 10;
  return 8;
}

function hierarchyBoost(currentRole: Candidate["role"], targetRole: Candidate["role"]) {
  if (!currentRole) return 0;
  if (currentRole === "SUPPORT" && targetRole === "PILLAR") return 14;
  if (currentRole === "PILLAR" && targetRole === "SUPPORT") return 10;
  if (currentRole === "AUX" && targetRole === "PILLAR") return 10;
  return 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trimAnchor(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(0, 7).join(" ");
}

function fallbackReason(candidate: Candidate) {
  const roleLabel =
    candidate.role === "PILLAR" ? "post pilar" : candidate.role === "SUPPORT" ? "post de suporte" : "post auxiliar";
  const semantic = candidate.semanticScore.toFixed(0);
  if (candidate.alreadyLinked) {
    return `Ja existe link para este ${roleLabel}. Mantido por alta afinidade semantica (${semantic}%).`;
  }
  return `Alta afinidade semantica (${semantic}%) com bom encaixe na hierarquia (${roleLabel}).`;
}

async function suggestWithAI(args: {
  title: string;
  keyword: string;
  text: string;
  currentRole: Candidate["role"];
  maxSuggestions: number;
  candidates: Candidate[];
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const prompt = `
Voce e especialista em SEO editorial para linkagem interna.
Selecione os melhores links internos para um artigo, priorizando:
- Hierarquia do silo (pilar/suporte/auxiliar)
- Coerencia semantica
- Naturalidade humana do texto
- Evitar excesso de links para o mesmo alvo

Retorne JSON valido:
{
  "suggestions": [
    {
      "post_id": "uuid",
      "anchor_text": "texto curto e natural",
      "reason": "1 frase",
      "confidence": 0.0
    }
  ]
}

Regras:
- maximo de ${args.maxSuggestions} itens
- priorize alvos com melhor score base e hierarquia
- nao invente post_id
- anchor_text deve ser curto (2 a 7 palavras)
`;

  const payload = {
    article: {
      title: args.title,
      keyword: args.keyword,
      currentRole: args.currentRole,
      textExcerpt: args.text.slice(0, 9000),
    },
    candidates: args.candidates.map((candidate) => ({
      post_id: candidate.postId,
      title: candidate.title,
      target_keyword: candidate.targetKeyword,
      role: candidate.role,
      position: candidate.position,
      semantic_score: candidate.semanticScore,
      hierarchy_score: candidate.hierarchyScore,
      final_score: candidate.finalScore,
      already_linked: candidate.alreadyLinked,
    })),
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nDados:\n${JSON.stringify(payload)}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") return null;

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.suggestions) ? (parsed.suggestions as Array<Record<string, any>>) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  await requireAdminSession();

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse({
    postId: typeof body?.postId === "string" ? body.postId : undefined,
    siloId: typeof body?.siloId === "string" ? body.siloId : undefined,
    title: typeof body?.title === "string" ? body.title : undefined,
    keyword: typeof body?.keyword === "string" ? body.keyword : undefined,
    text: typeof body?.text === "string" ? body.text : "",
    existingLinks: Array.isArray(body?.existingLinks) ? body.existingLinks : undefined,
    maxSuggestions: typeof body?.maxSuggestions === "number" ? body.maxSuggestions : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request", message: "Payload invalido." }, { status: 400 });
  }

  const rate = checkRateLimit(getClientKey(req), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Limite de sugestoes atingido. Aguarde alguns minutos.",
        retryAt: rate.resetAt,
      },
      { status: 429 }
    );
  }

  const payload = parsed.data;
  if (!payload.siloId) {
    return NextResponse.json({ ok: false, error: "missing_silo", message: "Este post precisa estar em um silo." }, { status: 400 });
  }

  const maxSuggestions = payload.maxSuggestions ?? 8;
  const articleTitle = payload.title?.trim() || "";
  const articleKeyword = payload.keyword?.trim() || "";
  const articleText = payload.text;
  const articleTokens = tokenize(`${articleTitle} ${articleKeyword} ${articleText.slice(0, 12000)}`);

  const supabase = getAdminSupabase();
  const [{ data: siloData, error: siloError }, { data: postsData, error: postsError }, { data: hierarchyData, error: hierarchyError }] =
    await Promise.all([
      supabase.from("silos").select("id,slug").eq("id", payload.siloId).maybeSingle(),
      supabase
        .from("posts")
        .select("id,title,slug,target_keyword,focus_keyword,content_html")
        .eq("silo_id", payload.siloId)
        .order("updated_at", { ascending: false }),
      supabase.from("silo_posts").select("post_id,role,position").eq("silo_id", payload.siloId),
    ]);

  if (siloError || !siloData) {
    return NextResponse.json({ ok: false, error: "silo_not_found", message: "Silo nao encontrado." }, { status: 404 });
  }
  if (postsError) {
    return NextResponse.json({ ok: false, error: "posts_error", message: "Falha ao carregar posts do silo." }, { status: 500 });
  }
  if (hierarchyError) {
    return NextResponse.json({ ok: false, error: "hierarchy_error", message: "Falha ao carregar hierarquia." }, { status: 500 });
  }

  const hierarchyMap = new Map<string, { role: Candidate["role"]; position: number | null }>();
  (hierarchyData ?? []).forEach((item: any) => {
    hierarchyMap.set(String(item.post_id), {
      role: (item.role as Candidate["role"]) ?? null,
      position: typeof item.position === "number" ? item.position : null,
    });
  });

  const currentRole = payload.postId ? hierarchyMap.get(payload.postId)?.role ?? null : null;
  const linkedPostIds = new Set<string>();
  const linkedPaths = new Set<string>();
  (payload.existingLinks ?? []).forEach((link) => {
    if (link?.dataPostId) linkedPostIds.add(link.dataPostId);
    if (link?.href) linkedPaths.add(extractPath(link.href));
  });

  const candidates: Candidate[] = (postsData ?? [])
    .filter((row: any) => String(row.id) !== String(payload.postId ?? ""))
    .map((row: any) => {
      const postId = String(row.id);
      const title = String(row.title ?? "");
      const slug = String(row.slug ?? "");
      const targetKeyword = String(row.target_keyword ?? row.focus_keyword ?? title).trim();
      const url = `/${siloData.slug}/${slug}`;
      const roleInfo = hierarchyMap.get(postId);
      const role = roleInfo?.role ?? null;
      const position = roleInfo?.position ?? null;
      const alreadyLinked = linkedPostIds.has(postId) || linkedPaths.has(extractPath(url));

      const candidateText = `${title} ${targetKeyword} ${stripHtml(String(row.content_html ?? "")).split(" ").slice(0, 100).join(" ")}`;
      const semanticScore = jaccard(articleTokens, tokenize(candidateText)) * 100;
      const hierarchyScore = roleBaseScore(role) + hierarchyBoost(currentRole, role);
      const keywordScore = jaccard(tokenize(articleKeyword), tokenize(targetKeyword)) * 100;
      const duplicatePenalty = alreadyLinked ? 30 : 0;
      const finalScore = clamp(semanticScore * 0.62 + hierarchyScore * 0.28 + keywordScore * 0.1 - duplicatePenalty, 0, 100);

      return {
        postId,
        title,
        slug,
        url,
        targetKeyword,
        role,
        position,
        semanticScore: Number(semanticScore.toFixed(1)),
        hierarchyScore: Number(hierarchyScore.toFixed(1)),
        keywordScore: Number(keywordScore.toFixed(1)),
        finalScore: Number(finalScore.toFixed(1)),
        alreadyLinked,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  if (!candidates.length) {
    return NextResponse.json({ ok: true, source: "empty", suggestions: [] }, { headers: { "x-rate-limit-remaining": String(rate.remaining) } });
  }

  const shortlist = candidates.slice(0, 20);
  const ai = await suggestWithAI({
    title: articleTitle,
    keyword: articleKeyword,
    text: articleText,
    currentRole,
    maxSuggestions,
    candidates: shortlist,
  });

  const selected = new Set<string>();
  const suggestions: Array<{
    postId: string;
    title: string;
    url: string;
    slug: string;
    role: Candidate["role"];
    position: number | null;
    score: number;
    semanticScore: number;
    hierarchyScore: number;
    anchorText: string;
    reason: string;
    source: "ai" | "heuristic";
    alreadyLinked: boolean;
  }> = [];

  if (Array.isArray(ai) && ai.length > 0) {
    for (const item of ai) {
      const postId = String(item?.post_id ?? "");
      if (!postId || selected.has(postId)) continue;
      const candidate = shortlist.find((entry) => entry.postId === postId);
      if (!candidate) continue;

      const confidenceRaw = Number(item?.confidence);
      const confidence = Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : 0.65;
      const blendedScore = Number(clamp(candidate.finalScore * 0.72 + confidence * 28, 0, 100).toFixed(1));
      const anchor = trimAnchor(String(item?.anchor_text ?? "")) || trimAnchor(candidate.targetKeyword) || trimAnchor(candidate.title);
      const reason = String(item?.reason ?? "").trim() || fallbackReason(candidate);

      selected.add(postId);
      suggestions.push({
        postId: candidate.postId,
        title: candidate.title,
        url: candidate.url,
        slug: candidate.slug,
        role: candidate.role,
        position: candidate.position,
        score: blendedScore,
        semanticScore: candidate.semanticScore,
        hierarchyScore: candidate.hierarchyScore,
        anchorText: anchor,
        reason,
        source: "ai",
        alreadyLinked: candidate.alreadyLinked,
      });
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  if (suggestions.length < maxSuggestions) {
    for (const candidate of shortlist) {
      if (selected.has(candidate.postId)) continue;
      selected.add(candidate.postId);
      suggestions.push({
        postId: candidate.postId,
        title: candidate.title,
        url: candidate.url,
        slug: candidate.slug,
        role: candidate.role,
        position: candidate.position,
        score: candidate.finalScore,
        semanticScore: candidate.semanticScore,
        hierarchyScore: candidate.hierarchyScore,
        anchorText: trimAnchor(candidate.targetKeyword) || trimAnchor(candidate.title),
        reason: fallbackReason(candidate),
        source: "heuristic",
        alreadyLinked: candidate.alreadyLinked,
      });
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      source: suggestions.some((item) => item.source === "ai") ? "ai+heuristic" : "heuristic",
      suggestions,
      totals: {
        candidates: candidates.length,
        linkedAlready: candidates.filter((item) => item.alreadyLinked).length,
      },
    },
    { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
  );
}
