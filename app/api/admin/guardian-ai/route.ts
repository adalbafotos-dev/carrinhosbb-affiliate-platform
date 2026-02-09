import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

const PROMPT = `
Você é um Especialista Sênior em SEO (KGR) e Copywriter de Conversão para o Brasil.
Objetivo: ajudar o editor a ajustar o texto para SEO moderno e conversão, respeitando KGR e evitando regras obsoletas.

Diretrizes:
- Mantenha a palavra-chave principal no início do H1 e no primeiro parágrafo.
- Se o Guardião reclamar de título longo, ignore se a palavra-chave precisa estar inteira.
- Não forçar keyword stuffing; use LSI/termos correlatos.
- Texto claro, parágrafos curtos, tom humano.

Responda SOMENTE em JSON válido com o seguinte formato:
{
  "analysis": "Resumo curto",
  "quick_fixes": ["item 1", "item 2", "item 3"],
  "suggested_meta_description": "texto curto",
  "suggested_first_paragraph": "texto curto"
}
`;

export async function POST(req: Request) {
  await requireAdminSession();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "missing_api_key" }, { status: 500 });
  }

  const text = String(payload.text ?? "").slice(0, 12000);
  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  const keyword = String(payload.keyword ?? "");
  const title = String(payload.title ?? "");
  const metaDescription = String(payload.metaDescription ?? "");

  const userPayload = {
    keyword,
    title,
    metaDescription,
    issues,
    text,
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
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "ai_http_error" }, { status: 500 });
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return NextResponse.json({ ok: false, error: "empty_response" }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(textResponse);
      return NextResponse.json({ ok: true, result: parsed });
    } catch {
      return NextResponse.json({ ok: true, result: { analysis: textResponse } });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "ai_error" }, { status: 500 });
  }
}
