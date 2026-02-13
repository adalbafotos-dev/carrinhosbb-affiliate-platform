import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildSemanticFoundationDiagnostics, extractFrequentTermsPtBr } from "@/lib/seo/semanticFoundation";

export const runtime = "nodejs";

const PROMPT = `
Voce e um especialista senior em SEO editorial para portugues do Brasil.
Objetivo: revisar conteudo com base em LSI (cobertura semantica) e PNL/NLP (estrutura por intencao).

Diretrizes obrigatorias:
- Nao usar keyword stuffing.
- Priorizar clareza, intencao e linguagem natural.
- Garantir cobertura semantica com termos relacionados do topico.
- Indicar lacunas de estrutura PNL: definicao, para quem e, como funciona, vantagens/desvantagens, erros comuns, checklist, FAQ.
- Recomendar correcoes objetivas, aplicaveis no texto atual.

Responda SOMENTE em JSON valido:
{
  "analysis": "Resumo curto e direto",
  "quick_fixes": ["item 1", "item 2", "item 3"],
  "suggested_meta_description": "texto curto",
  "suggested_first_paragraph": "texto curto",
  "lsi_gaps": ["termo 1", "termo 2"],
  "pnl_missing_sections": ["faq", "checklist"],
  "priority_actions": ["acao 1", "acao 2"]
}
`;

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}

function buildLocalFallback(args: {
  title: string;
  keyword: string;
  metaDescription: string;
  text: string;
  diagnostics: ReturnType<typeof buildSemanticFoundationDiagnostics>;
}) {
  const lsiGaps = args.diagnostics.coverage.missingRelatedTerms.slice(0, 6);
  const pnlMissing = args.diagnostics.structure.missingSections.slice(0, 5);
  const frequentTerms = extractFrequentTermsPtBr(args.text, { limit: 8 });

  const quickFixes: string[] = [];
  if (lsiGaps.length > 0) quickFixes.push(`Incluir termos relacionados ao tema: ${lsiGaps.slice(0, 3).join(", ")}.`);
  if (pnlMissing.length > 0) quickFixes.push(`Adicionar secoes PNL ausentes: ${pnlMissing.join(", ")}.`);
  if (args.diagnostics.coverage.repeatedTerms.length > 0) {
    const hot = args.diagnostics.coverage.repeatedTerms.slice(0, 2).map((item) => item.term).join(", ");
    quickFixes.push(`Reduzir repeticao de termos para evitar stuffing (${hot}).`);
  }
  if (!quickFixes.length) {
    quickFixes.push("Manter estrutura clara em H2/H3 com foco na intencao de busca.");
    quickFixes.push("Expandir exemplos praticos e linguagem natural para reforcar NLP.");
  }

  const metaBase =
    args.metaDescription.trim() ||
    `${args.keyword || args.title}: guia pratico com explicacoes claras, cuidados e comparacoes para decidir com seguranca.`;

  const firstParagraphBase = `Se voce busca ${args.keyword || args.title}, este guia explica de forma direta como funciona, quando usar e quais cuidados evitar para ter resultado melhor.`;

  return {
    analysis: `Cobertura LSI ${args.diagnostics.coverage.lsiCoverageScore}% e estrutura PNL ${args.diagnostics.structure.coverageScore}%.`,
    quick_fixes: quickFixes.slice(0, 6),
    suggested_meta_description: truncate(metaBase, 155),
    suggested_first_paragraph: truncate(firstParagraphBase, 260),
    lsi_gaps: lsiGaps,
    pnl_missing_sections: pnlMissing,
    priority_actions: [
      ...(lsiGaps.length ? ["Reforcar termos semanticos ausentes no corpo e nos H2/H3."] : []),
      ...(pnlMissing.length ? ["Completar blocos PNL para cobrir toda a intencao da busca."] : []),
      ...(frequentTerms.length ? [`Usar variacoes naturais como: ${frequentTerms.slice(0, 4).join(", ")}.`] : []),
    ].slice(0, 4),
  };
}

export async function POST(req: Request) {
  await requireAdminSession();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const text = String(payload.text ?? "").slice(0, 12000);
  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  const keyword = String(payload.keyword ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const metaDescription = String(payload.metaDescription ?? "").trim();

  const diagnostics = buildSemanticFoundationDiagnostics({
    text,
    keyword,
    relatedTerms: extractFrequentTermsPtBr(text, { limit: 12 }),
    entities: [],
  });

  const localFallback = buildLocalFallback({
    title,
    keyword,
    metaDescription,
    text,
    diagnostics,
  });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      source: "local_fallback",
      result: localFallback,
      diagnostics,
    });
  }

  const userPayload = {
    keyword,
    title,
    metaDescription,
    issues,
    text,
    diagnostics,
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${PROMPT}\n\nDados:\n${JSON.stringify(userPayload)}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        ok: true,
        source: "local_fallback",
        result: localFallback,
        diagnostics,
      });
    }

    const data = await response.json().catch(() => null);
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse || typeof textResponse !== "string") {
      return NextResponse.json({
        ok: true,
        source: "local_fallback",
        result: localFallback,
        diagnostics,
      });
    }

    try {
      const parsed = JSON.parse(textResponse);
      return NextResponse.json({ ok: true, source: "ai", result: parsed, diagnostics });
    } catch {
      return NextResponse.json({
        ok: true,
        source: "ai_text_fallback",
        result: { ...localFallback, analysis: truncate(textResponse, 600) },
        diagnostics,
      });
    }
  } catch {
    return NextResponse.json({
      ok: true,
      source: "local_fallback",
      result: localFallback,
      diagnostics,
    });
  }
}
