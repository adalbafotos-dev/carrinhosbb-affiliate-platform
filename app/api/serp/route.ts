import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { getGoogleCseCredentials } from "@/lib/google/settings";
import { fetchCustomSearch, GoogleCseError } from "@/lib/google/customSearch";
import { getSerpCache, setSerpCache } from "@/lib/cache/serpCache";

const PayloadSchema = z.object({
  query: z.string().min(2).max(120),
  num: z.number().int().min(1).max(10).optional(),
  start: z.number().int().min(1).max(91).optional(),
  hl: z.string().min(2).max(10).optional(),
  gl: z.string().min(2).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse({
      query: body?.query,
      num: typeof body?.num === "number" ? body.num : body?.num ? Number(body.num) : undefined,
      start: typeof body?.start === "number" ? body.start : body?.start ? Number(body.start) : undefined,
      hl: typeof body?.hl === "string" ? body.hl.trim() : undefined,
      gl: typeof body?.gl === "string" ? body.gl.trim() : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", message: "Query invalida." }, { status: 400 });
    }

    const query = parsed.data.query.trim();
    if (query.length < 2 || query.length > 120) {
      return NextResponse.json({ error: "invalid_request", message: "Query deve ter entre 2 e 120 caracteres." }, { status: 400 });
    }

    // Requires GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX (env or admin settings).
    const credentials = await getGoogleCseCredentials();
    if (!credentials) {
      return NextResponse.json(
        {
          error: "missing_credentials",
          message: "Configure GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX (env ou integracao no Admin).",
        },
        { status: 400 }
      );
    }

    const num = parsed.data.num ?? 10;
    const start = parsed.data.start ?? null;
    const hl = parsed.data.hl?.trim() || null;
    const gl = parsed.data.gl?.trim().toUpperCase() || null;

    const cacheKey = { query, gl, hl, num, start };
    const cached = await getSerpCache(cacheKey);
    if (cached) {
      return NextResponse.json({
        query,
        items: cached.items,
        meta: {
          ...(cached.meta ?? {}),
          cache: "hit",
        },
      });
    }

    const { items, meta } = await fetchCustomSearch({
      query,
      apiKey: credentials.apiKey,
      cx: credentials.cx,
      num,
      start: start ?? undefined,
      hl: hl ?? undefined,
      gl: gl ?? undefined,
    });

    await setSerpCache(cacheKey, items, meta);

    return NextResponse.json({
      query,
      items,
      meta: {
        ...(meta ?? {}),
        cache: "miss",
      },
    });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    if (error instanceof GoogleCseError) {
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json({ error: "invalid_credentials", message: "Credenciais Google invalidas." }, { status: error.status });
      }
      if (error.status === 429) {
        return NextResponse.json({ error: "quota_exceeded", message: "Quota da API do Google excedida." }, { status: 429 });
      }
      if (error.status === 504) {
        return NextResponse.json({ error: "timeout", message: "Timeout ao consultar o Google." }, { status: 504 });
      }
      return NextResponse.json(
        { error: "google_error", message: "Erro ao consultar o Google.", details: error.code },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json({ error: "internal_error", message: "Erro interno." }, { status: 500 });
  }
}
