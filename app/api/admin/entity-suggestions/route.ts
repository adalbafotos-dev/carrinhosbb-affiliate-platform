import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminSearchPostsByTitle } from "@/lib/db";
import { checkRateLimit } from "@/lib/seo/rateLimit";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  title: z.string().max(220).optional(),
  keyword: z.string().max(180).optional(),
  postId: z.string().uuid().optional(),
  text: z.string().min(80).max(120_000),
  existingEntities: z.array(z.string()).max(80).optional(),
  supportingKeywords: z.array(z.string()).max(120).optional(),
  maxSuggestions: z.number().int().min(3).max(12).optional(),
});

const RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
};

const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "para",
  "por",
  "com",
  "sem",
  "um",
  "uma",
  "uns",
  "umas",
  "o",
  "a",
  "os",
  "as",
  "na",
  "no",
  "nas",
  "nos",
  "que",
  "como",
  "sobre",
  "mais",
  "menos",
  "se",
  "ao",
  "aos",
  "ainda",
  "ja",
  "ou",
  "tambem",
  "isso",
  "essa",
  "esse",
  "este",
  "esta",
  "sao",
  "ser",
  "estar",
  "foi",
  "foram",
  "tem",
  "ter",
]);

type MentionPost = {
  id: string;
  title: string;
  url: string;
};

type EntitySuggestion = {
  term: string;
  reason: string;
  confidence: number;
  suggestedLinkType: "about" | "mention";
  aboutUrl: string | null;
  mentionPost: MentionPost | null;
};

function getClientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `entity-suggestions:${ip}`;
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

function dedupeTerms(terms: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  terms.forEach((raw) => {
    const cleaned = String(raw || "").trim();
    if (cleaned.length < 3) return;
    const key = normalize(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  });
  return out;
}

function parseKeywordTerm(raw: string) {
  const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
  return parts[0] || "";
}

function extractFrequentTerms(text: string, limit: number) {
  const normalized = normalize(text);
  const tokens = normalized.split(" ").filter((token) => token.length >= 4 && !STOPWORDS.has(token));
  const uniCounts = new Map<string, number>();
  for (const token of tokens) {
    uniCounts.set(token, (uniCounts.get(token) ?? 0) + 1);
  }

  const biCounts = new Map<string, number>();
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const a = tokens[index];
    const b = tokens[index + 1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    const bi = `${a} ${b}`;
    biCounts.set(bi, (biCounts.get(bi) ?? 0) + 1);
  }

  const candidates = [
    ...Array.from(biCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .filter(([, count]) => count >= 2)
      .map(([term]) => term),
    ...Array.from(uniCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .filter(([, count]) => count >= 3)
      .map(([term]) => term),
  ];

  return dedupeTerms(candidates).slice(0, limit);
}

function buildWikipediaUrl(termOrTitle: string) {
  const slug = termOrTitle.trim().replace(/\s+/g, "_");
  return `https://pt.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}

async function findMentionPost(term: string, currentPostId?: string) {
  try {
    const rows = await adminSearchPostsByTitle(term, 5);
    const candidate = rows.find((row) => row.id !== currentPostId) ?? rows[0];
    if (!candidate) return null;
    return {
      id: candidate.id,
      title: candidate.title,
      url: `/${candidate.silo_slug}/${candidate.slug}`,
    } satisfies MentionPost;
  } catch {
    return null;
  }
}

const AI_PROMPT = `
Voce e especialista em SEO semantico para conteudo em portugues (Brasil).
Recebera dados de um artigo e precisa sugerir entidades para reforco semantico com links.

Regras:
- Retorne no maximo 8 sugestoes objetivas.
- Evite termos genericos e vagos.
- Priorize entidades nomeadas (tecnicas, materiais, conceitos, marcas, orgaos, normas, etc).
- Para cada item informe:
  - term: entidade sugerida
  - reason: justificativa curta (1 frase)
  - confidence: numero de 0 a 1
  - suggested_link_type: "about" ou "mention"
  - wikipedia_title: titulo de pagina da Wikipedia em portugues (quando fizer sentido)
  - mention_query: termo para buscar post interno relacionado

Resposta obrigatoria em JSON valido:
{
  "suggestions": [
    {
      "term": "...",
      "reason": "...",
      "confidence": 0.0,
      "suggested_link_type": "about",
      "wikipedia_title": "...",
      "mention_query": "..."
    }
  ]
}
`;

async function suggestWithAI(input: {
  title: string;
  keyword: string;
  text: string;
  existingEntities: string[];
  supportingKeywords: string[];
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const payload = {
    title: input.title,
    keyword: input.keyword,
    existingEntities: input.existingEntities.slice(0, 25),
    supportingKeywords: input.supportingKeywords.slice(0, 40),
    text: input.text.slice(0, 14000),
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${AI_PROMPT}\n\nDados:\n${JSON.stringify(payload)}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) return null;

  const json = await response.json().catch(() => null);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") return null;

  try {
    const parsed = JSON.parse(text);
    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
    return suggestions as Array<Record<string, any>>;
  } catch {
    return null;
  }
}

function buildFallbackSuggestions(args: {
  existingEntities: string[];
  supportingKeywords: string[];
  text: string;
  maxSuggestions: number;
}) {
  const supportTerms = args.supportingKeywords.map(parseKeywordTerm).filter(Boolean);
  const frequentTerms = extractFrequentTerms(args.text, args.maxSuggestions + 3);
  const merged = dedupeTerms([...args.existingEntities, ...supportTerms, ...frequentTerms]).slice(0, args.maxSuggestions);

  return merged.map((term, index) => ({
    term,
    reason: "Termo recorrente no texto e relevante para reforco semantico.",
    confidence: Number((0.72 - index * 0.04).toFixed(2)),
    suggested_link_type: index % 3 === 0 ? "mention" : "about",
    wikipedia_title: term,
    mention_query: term,
  }));
}

function sanitizeTerm(value: any) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  if (cleaned.length < 3 || cleaned.length > 90) return "";
  return cleaned;
}

function sanitizeConfidence(value: any) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.65;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return Number(num.toFixed(2));
}

function sanitizeLinkType(value: any): "about" | "mention" {
  const next = String(value || "").toLowerCase();
  if (next === "mention") return "mention";
  return "about";
}

export async function POST(req: Request) {
  await requireAdminSession();

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse({
    title: typeof body?.title === "string" ? body.title : undefined,
    keyword: typeof body?.keyword === "string" ? body.keyword : undefined,
    postId: typeof body?.postId === "string" ? body.postId : undefined,
    text: typeof body?.text === "string" ? body.text : "",
    existingEntities: Array.isArray(body?.existingEntities) ? body.existingEntities : undefined,
    supportingKeywords: Array.isArray(body?.supportingKeywords) ? body.supportingKeywords : undefined,
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
  const title = payload.title?.trim() || "";
  const keyword = payload.keyword?.trim() || "";
  const text = payload.text;
  const existingEntities = dedupeTerms(payload.existingEntities ?? []);
  const supportingKeywords = dedupeTerms((payload.supportingKeywords ?? []).map((item) => parseKeywordTerm(item)));
  const maxSuggestions = payload.maxSuggestions ?? 8;

  const aiResult = await suggestWithAI({
      title,
      keyword,
      text,
      existingEntities,
      supportingKeywords,
    });

  const usedAi = Array.isArray(aiResult) && aiResult.length > 0;
  const aiRaw = aiResult ?? buildFallbackSuggestions({ existingEntities, supportingKeywords, text, maxSuggestions });

  const normalizedRaw = Array.isArray(aiRaw) ? aiRaw : [];
  const dedupe = new Set<string>();
  const normalized = normalizedRaw
    .map((item) => {
      const term = sanitizeTerm(item?.term);
      if (!term) return null;
      const key = normalize(term);
      if (!key || dedupe.has(key)) return null;
      dedupe.add(key);

      return {
        term,
        reason: String(item?.reason || "Entidade relevante para reforco semantico do topico.").trim(),
        confidence: sanitizeConfidence(item?.confidence),
        suggestedLinkType: sanitizeLinkType(item?.suggested_link_type),
        wikipediaTitle: sanitizeTerm(item?.wikipedia_title) || term,
        mentionQuery: sanitizeTerm(item?.mention_query) || term,
      };
    })
    .filter(Boolean)
    .slice(0, maxSuggestions) as Array<{
    term: string;
    reason: string;
    confidence: number;
    suggestedLinkType: "about" | "mention";
    wikipediaTitle: string;
    mentionQuery: string;
  }>;

  const suggestions: EntitySuggestion[] = await Promise.all(
    normalized.map(async (item) => {
      const mentionPost = await findMentionPost(item.mentionQuery, payload.postId);
      return {
        term: item.term,
        reason: item.reason || "Entidade relevante para o tema.",
        confidence: item.confidence,
        suggestedLinkType: item.suggestedLinkType,
        aboutUrl: buildWikipediaUrl(item.wikipediaTitle),
        mentionPost,
      };
    })
  );

  return NextResponse.json(
    {
      ok: true,
      source: usedAi ? "ai" : "fallback",
      suggestions,
    },
    { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
  );
}
