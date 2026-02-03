import type { Post } from "@/lib/types";
import type { SerpItem } from "@/lib/google/types";

export type CannibalizationPair = {
  postAId: string;
  postBId: string;
  similarityScore: number;
  serpOverlapScore?: number | null;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
};

export type SerpResultsByPost = Record<string, { items: SerpItem[]; totalResults?: number } | undefined>;

type PostInput = Pick<Post, "id" | "title" | "content_html" | "content_json" | "target_keyword"> & {
  focus_keyword?: string | null;
};

const DEFAULT_SNIPPET_WORDS = 600;

function stripHtml(html: string) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromJson(node: any): string {
  if (!node) return "";
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (!Array.isArray(node.content)) return "";
  return node.content.map(extractTextFromJson).join(" ");
}

function extractHeadingsFromJson(node: any, acc: string[] = []) {
  if (!node) return acc;
  if (node.type === "heading") {
    const text = extractTextFromJson(node);
    if (text) acc.push(text);
  }
  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => extractHeadingsFromJson(child, acc));
  }
  return acc;
}

function extractHeadingsFromHtml(html: string) {
  const headings: string[] = [];
  const regex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html))) {
    const text = stripHtml(match[1] ?? "");
    if (text.trim()) headings.push(text.trim());
  }
  return headings;
}

function extractPlainText(content: string | any) {
  if (!content) return "";
  if (typeof content === "string") return stripHtml(content);
  return extractTextFromJson(content);
}

function buildFingerprint(post: PostInput) {
  const title = post.title ?? "";
  const headings = typeof post.content_html === "string" ? extractHeadingsFromHtml(post.content_html) : extractHeadingsFromJson(post.content_json);
  const rawText = extractPlainText(post.content_html || post.content_json || "");
  const words = normalizeText(rawText).split(" ").filter(Boolean);
  const snippet = words.slice(0, DEFAULT_SNIPPET_WORDS).join(" ");
  return normalizeText([title, headings.join(" "), snippet].join(" "));
}

function tokenizeFingerprint(fingerprint: string) {
  if (!fingerprint) return [];
  return fingerprint.split(" ").filter((token) => token.length > 2);
}

function jaccard(tokensA: string[], tokensB: string[]) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function getPostQuery(post: PostInput) {
  return (
    post.focus_keyword?.trim() ||
    post.target_keyword?.trim() ||
    post.title?.trim() ||
    ""
  );
}

export function deriveRiskLevel(similarityScore: number, serpOverlapScore?: number | null): "low" | "medium" | "high" {
  if (typeof serpOverlapScore === "number") {
    if (similarityScore >= 0.6 && serpOverlapScore >= 0.35) return "high";
    if (similarityScore >= 0.45 || serpOverlapScore >= 0.3) return "medium";
    return "low";
  }
  if (similarityScore >= 0.55) return "high";
  if (similarityScore >= 0.35) return "medium";
  return "low";
}

export function buildRecommendation(similarityScore: number, serpOverlapScore?: number | null, riskLevel?: "low" | "medium" | "high") {
  const risk = riskLevel ?? deriveRiskLevel(similarityScore, serpOverlapScore);
  if (risk === "high") {
    return "Separar intenções: ajuste H2/H3 para subtemas exclusivos, revise o foco da keyword e considere formatos diferentes (guia vs comparativo).";
  }
  if (risk === "medium") {
    return "Refinar ângulo e headings para reduzir sobreposição. Use exemplos, FAQ ou comparativos distintos.";
  }
  return "Sem canibalização forte detectada. Mantenha monitoramento conforme novos posts entrarem no silo.";
}

export function buildInternalSimilarity(posts: PostInput[]): CannibalizationPair[] {
  const fingerprints = new Map<string, string[]>();
  posts.forEach((post) => {
    const fingerprint = buildFingerprint(post);
    fingerprints.set(post.id, tokenizeFingerprint(fingerprint));
  });

  const pairs: CannibalizationPair[] = [];
  for (let i = 0; i < posts.length; i += 1) {
    for (let j = i + 1; j < posts.length; j += 1) {
      const a = posts[i];
      const b = posts[j];
      const score = jaccard(fingerprints.get(a.id) ?? [], fingerprints.get(b.id) ?? []);
      const risk = deriveRiskLevel(score, null);
      pairs.push({
        postAId: a.id,
        postBId: b.id,
        similarityScore: Number(score.toFixed(3)),
        serpOverlapScore: null,
        riskLevel: risk,
        recommendation: buildRecommendation(score, null, risk),
      });
    }
  }

  return pairs.sort((x, y) => y.similarityScore - x.similarityScore);
}

function normalizeSerpUrl(link: string) {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./i, "");
    const path = url.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function extractDomain(item: SerpItem) {
  if (item.displayLink) return item.displayLink.replace(/^www\./i, "");
  try {
    return new URL(item.link).hostname.replace(/^www\./i, "");
  } catch {
    return item.link.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

export function computeSerpOverlapScore(itemsA: SerpItem[] = [], itemsB: SerpItem[] = []) {
  const urlSetA = new Set(itemsA.map((item) => normalizeSerpUrl(item.link)));
  const urlSetB = new Set(itemsB.map((item) => normalizeSerpUrl(item.link)));
  const domainSetA = new Set(itemsA.map(extractDomain));
  const domainSetB = new Set(itemsB.map(extractDomain));

  const urlIntersection = Array.from(urlSetA).filter((url) => urlSetB.has(url)).length;
  const domainIntersection = Array.from(domainSetA).filter((domain) => domainSetB.has(domain)).length;

  const urlDenom = Math.max(1, Math.min(urlSetA.size, urlSetB.size));
  const domainDenom = Math.max(1, Math.min(domainSetA.size, domainSetB.size));

  const urlOverlap = urlIntersection / urlDenom;
  const domainOverlap = domainIntersection / domainDenom;
  const score = urlOverlap * 0.6 + domainOverlap * 0.4;

  return {
    urlOverlap: Number(urlOverlap.toFixed(3)),
    domainOverlap: Number(domainOverlap.toFixed(3)),
    score: Number(score.toFixed(3)),
  };
}

export function applySerpOverlapToPairs(pairs: CannibalizationPair[], serpResults: SerpResultsByPost): CannibalizationPair[] {
  return pairs.map((pair) => {
    const a = serpResults[pair.postAId];
    const b = serpResults[pair.postBId];
    const serpScore = a && b ? computeSerpOverlapScore(a.items, b.items).score : null;
    const risk = deriveRiskLevel(pair.similarityScore, serpScore);
    return {
      ...pair,
      serpOverlapScore: serpScore,
      riskLevel: risk,
      recommendation: buildRecommendation(pair.similarityScore, serpScore, risk),
    };
  });
}
