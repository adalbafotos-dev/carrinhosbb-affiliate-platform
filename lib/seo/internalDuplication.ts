import { extractPlainTextForAnalysis } from "@/lib/seo/plagiarism";
import {
  buildSemanticFoundationDiagnostics,
  normalizePtBr,
  tokenizePtBr,
} from "@/lib/seo/semanticFoundation";

export type DuplicateRiskLevel = "low" | "medium" | "high";

export type InternalDuplicateMatch = {
  chunkText: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: DuplicateRiskLevel;
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  sourceExcerpt: string;
  alternatives: string[];
};

export type InternalDuplicateAnalysis = {
  uniquenessScore: number;
  riskLevel: DuplicateRiskLevel;
  totalWords: number;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  comparedPosts: number;
  summary: string;
  semanticDiagnostics?: ReturnType<typeof buildSemanticFoundationDiagnostics>;
  matches: InternalDuplicateMatch[];
};

type CandidateInput = {
  id: string;
  title: string;
  slug: string;
  targetKeyword?: string | null;
  focusKeyword?: string | null;
  contentHtml?: string | null;
  contentJson?: any;
  text?: string | null;
};

type TextWindow = {
  text: string;
  tokens: string[];
};

type CandidateWindows = {
  postId: string;
  postTitle: string;
  postSlug: string;
  windows: TextWindow[];
};

const MIN_TOTAL_WORDS = 80;
const MIN_WORD_LEN = 3;
const MIN_CHUNK_WORDS = 8;
const SOURCE_MIN_WORDS = 50;
const CURRENT_CHUNK_WORDS = 18;
const CURRENT_CHUNK_STEP = 11;
const SOURCE_CHUNK_WORDS = 22;
const SOURCE_CHUNK_STEP = 12;
const MAX_CURRENT_WINDOWS = 140;
const MAX_SOURCE_WINDOWS_PER_POST = 180;

function normalizeText(value: string) {
  return normalizePtBr(value);
}

function tokenize(value: string) {
  return tokenizePtBr(value, {
    minLen: MIN_WORD_LEN,
    removeStopWords: true,
    stem: true,
  });
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

function overlapCoverage(tokensA: string[], tokensB: string[]) {
  const base = Array.from(new Set(tokensA));
  if (!base.length) return { overlap: 0, ratio: 0 };
  const setB = new Set(tokensB);
  let overlap = 0;
  base.forEach((token) => {
    if (setB.has(token)) overlap += 1;
  });
  return { overlap, ratio: overlap / base.length };
}

function classifyMatchRisk(score: number): DuplicateRiskLevel {
  if (score >= 0.72) return "high";
  if (score >= 0.58) return "medium";
  return "low";
}

function classifyGlobalRisk(uniquenessScore: number): DuplicateRiskLevel {
  if (uniquenessScore <= 45) return "high";
  if (uniquenessScore <= 70) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildWindows(input: string, windowWords: number, stepWords: number, maxWindows: number): TextWindow[] {
  const words = normalizeSpaces(input).split(" ").filter(Boolean);
  if (words.length < MIN_CHUNK_WORDS) return [];

  const out: TextWindow[] = [];
  for (let start = 0; start < words.length && out.length < maxWindows; start += stepWords) {
    const chunk = words.slice(start, start + windowWords);
    if (chunk.length < MIN_CHUNK_WORDS) continue;
    const text = chunk.join(" ");
    const tokens = tokenize(text);
    if (tokens.length < MIN_CHUNK_WORDS - 2) continue;
    out.push({ text, tokens });
  }

  return out;
}

function applySimpleSynonyms(value: string) {
  return value
    .replace(/\bmelhor\b/gi, "mais indicado")
    .replace(/\bimportante\b/gi, "essencial")
    .replace(/\bdeve\b/gi, "vale")
    .replace(/\bnecessario\b/gi, "fundamental")
    .replace(/\bajuda\b/gi, "contribui");
}

function shorten(value: string, words = 16) {
  return value.split(" ").filter(Boolean).slice(0, words).join(" ");
}

function buildAlternatives(chunkText: string, targetKeyword?: string | null) {
  const keyword = (targetKeyword || "").trim();
  const transformed = applySimpleSynonyms(chunkText);
  const short = shorten(transformed, 14);
  const focus = keyword || "tema central";

  return [
    `No contexto deste guia sobre ${focus}, priorize exemplo proprio: ${short}.`,
    `Troque a estrutura: comece pelo resultado pratico e depois explique o motivo com linguagem nova.`,
    `Mantenha a ideia, mas inclua um dado/teste proprio e evite repetir termos identicos do trecho original.`,
  ];
}

function buildSummary(args: {
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  uniquenessScore: number;
  comparedPosts: number;
}) {
  if (!args.comparedPosts) {
    return "Nao ha outros posts no silo para comparar.";
  }
  if (!args.checkedChunks) {
    return "Sem texto suficiente para comparar com os posts do silo.";
  }
  if (!args.suspectChunks) {
    return "Nao encontramos sobreposicao forte com posts do mesmo silo.";
  }
  if (args.highRiskChunks > 0) {
    return `${args.highRiskChunks} trecho(s) com risco alto de duplicacao interna. Reescreva antes de publicar.`;
  }
  if (args.uniquenessScore < 70) {
    return "Foram encontrados trechos muito parecidos com posts do silo. Ajuste o angulo e exemplos.";
  }
  return "Existe sobreposicao moderada. Diferencie narrativa e foco para reduzir canibalizacao.";
}

export function inspectInternalDuplication(args: {
  text: string;
  candidates: CandidateInput[];
  targetKeyword?: string | null;
  maxMatches?: number;
}): InternalDuplicateAnalysis {
  const text = normalizeSpaces(args.text || "");
  const semanticDiagnostics = buildSemanticFoundationDiagnostics({
    text,
    keyword: args.targetKeyword ?? "",
    relatedTerms: [],
    entities: [],
  });
  const totalWords = text ? text.split(" ").filter(Boolean).length : 0;
  const maxMatches = clamp(Math.round(args.maxMatches ?? 10), 3, 20);

  const candidateWindows: CandidateWindows[] = (args.candidates || [])
    .map((candidate) => {
      const rawSourceText =
        candidate.text?.trim() ||
        extractPlainTextForAnalysis(candidate.contentHtml ?? null, candidate.contentJson) ||
        "";
      const sourceText = normalizeSpaces(rawSourceText);
      const sourceWords = sourceText ? sourceText.split(" ").filter(Boolean).length : 0;
      if (sourceWords < SOURCE_MIN_WORDS) return null;

      const windows = buildWindows(
        sourceText,
        SOURCE_CHUNK_WORDS,
        SOURCE_CHUNK_STEP,
        MAX_SOURCE_WINDOWS_PER_POST
      );
      if (!windows.length) return null;

      return {
        postId: candidate.id,
        postTitle: candidate.title,
        postSlug: candidate.slug,
        windows,
      } satisfies CandidateWindows;
    })
    .filter(Boolean) as CandidateWindows[];

  const comparedPosts = candidateWindows.length;
  if (!text || totalWords < MIN_TOTAL_WORDS) {
    return {
      uniquenessScore: 100,
      riskLevel: "low",
      totalWords,
      checkedChunks: 0,
      suspectChunks: 0,
      highRiskChunks: 0,
      comparedPosts,
      summary: buildSummary({
        checkedChunks: 0,
        suspectChunks: 0,
        highRiskChunks: 0,
        uniquenessScore: 100,
        comparedPosts,
      }),
      semanticDiagnostics,
      matches: [],
    };
  }

  const currentChunks = buildWindows(text, CURRENT_CHUNK_WORDS, CURRENT_CHUNK_STEP, MAX_CURRENT_WINDOWS);
  if (!currentChunks.length || comparedPosts === 0) {
    return {
      uniquenessScore: 100,
      riskLevel: "low",
      totalWords,
      checkedChunks: currentChunks.length,
      suspectChunks: 0,
      highRiskChunks: 0,
      comparedPosts,
      summary: buildSummary({
        checkedChunks: currentChunks.length,
        suspectChunks: 0,
        highRiskChunks: 0,
        uniquenessScore: 100,
        comparedPosts,
      }),
      semanticDiagnostics,
      matches: [],
    };
  }

  const rawMatches: InternalDuplicateMatch[] = [];
  for (const chunk of currentChunks) {
    let best: {
      score: number;
      overlapTokens: number;
      sourcePostId: string;
      sourceTitle: string;
      sourceSlug: string;
      sourceExcerpt: string;
    } | null = null;

    for (const candidate of candidateWindows) {
      for (const sourceWindow of candidate.windows) {
        const j = jaccard(chunk.tokens, sourceWindow.tokens);
        if (j < 0.16) continue;

        const overlap = overlapCoverage(chunk.tokens, sourceWindow.tokens);
        let score = j * 0.62 + overlap.ratio * 0.38;

        const probe = normalizeText(chunk.text).split(" ").slice(0, 5).join(" ");
        if (probe.length > 15 && normalizeText(sourceWindow.text).includes(probe)) {
          score = Math.min(1, score + 0.08);
        }

        if (!best || score > best.score) {
          best = {
            score,
            overlapTokens: overlap.overlap,
            sourcePostId: candidate.postId,
            sourceTitle: candidate.postTitle,
            sourceSlug: candidate.postSlug,
            sourceExcerpt: sourceWindow.text,
          };
        }
      }
    }

    if (!best || best.score < 0.52) continue;

    rawMatches.push({
      chunkText: chunk.text,
      similarityScore: Number(best.score.toFixed(3)),
      overlapTokens: best.overlapTokens,
      riskLevel: classifyMatchRisk(best.score),
      sourcePostId: best.sourcePostId,
      sourceTitle: best.sourceTitle,
      sourceSlug: best.sourceSlug,
      sourceExcerpt: best.sourceExcerpt,
      alternatives: buildAlternatives(chunk.text, args.targetKeyword),
    });
  }

  const dedupe = new Set<string>();
  const matches = rawMatches
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .filter((match) => {
      const key = `${normalizeText(match.chunkText).slice(0, 120)}::${match.sourcePostId}`;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    })
    .slice(0, maxMatches);

  const checkedChunks = currentChunks.length;
  const suspectChunks = rawMatches.length;
  const highRiskChunks = rawMatches.filter((item) => item.riskLevel === "high").length;
  const suspectRatio = checkedChunks ? suspectChunks / checkedChunks : 0;
  const highRatio = checkedChunks ? highRiskChunks / checkedChunks : 0;
  const avgScore =
    suspectChunks > 0
      ? rawMatches.reduce((sum, item) => sum + item.similarityScore, 0) / suspectChunks
      : 0;

  const penalty = suspectRatio * 70 + highRatio * 20 + avgScore * 10;
  const uniquenessScore = Math.round(clamp(100 - penalty, 0, 100));
  const riskLevel = classifyGlobalRisk(uniquenessScore);
  const baseSummary = buildSummary({
    checkedChunks,
    suspectChunks,
    highRiskChunks,
    uniquenessScore,
    comparedPosts,
  });
  const summary =
    semanticDiagnostics.structure.coverageScore < 45
      ? `${baseSummary} Estrutura PNL incompleta; inclua secoes de intencao e resposta direta.`
      : baseSummary;

  return {
    uniquenessScore,
    riskLevel,
    totalWords,
    checkedChunks,
    suspectChunks,
    highRiskChunks,
    comparedPosts,
    summary,
    semanticDiagnostics,
    matches,
  };
}
