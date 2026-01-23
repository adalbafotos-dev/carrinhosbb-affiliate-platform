# Plataforma de Nicho (Unhas/Manicure) -- Next.js 16 + Supabase + Tiptap

Este repositorio e um *starter* pronto para:
- Blog em arquitetura de **silos** (`/silo/post`) com **SSG + ISR** (`revalidate: 3600`)
- CMS interno em `/admin` com **Tiptap** (focado em construtor de reviews)
- Integracao preparada para **Amazon Associates** (links com `rel="sponsored"`)

> Importante: a area `/admin` usa senha simples via cookie httpOnly. Em producao, troque por um fluxo de login completo.

## Stack (fixa)
- Next.js 16.0.7 (App Router, Server Actions)
- React 19.2.1
- Tailwind CSS 4.1.17
- Supabase (PostgreSQL)
- Tiptap (Headless, React)
- Lucide React
- Deploy: Vercel

## 1) Pre-requisitos
- Node.js 20+ (recomendado)
- Conta no Supabase

## 2) Configuracao do Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor do Supabase, execute:
   - `supabase/schema.sql`
3. Garanta o bucket publico `media` no Storage (migracao ja cria se nao existir).

## 3) Variaveis de ambiente

Crie um arquivo `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)
- `ADMIN_PASSWORD` (senha para /admin/login)
- `ADMIN_DISABLE_AUTH=1` (opcional, libera /admin apenas em ambiente local)
- `ADMIN_UPLOAD_MAX_MB` (opcional, limite de upload no admin; default 6)
- `SITE_URL` (ex.: https://seusite.com.br)

## 4) Seed inicial (silos + posts)

Apos criar as tabelas, rode:
```bash
pnpm install
pnpm seed
```

O seed usa o JSON em `supabase/seed.json` e cria rascunhos + 1 publicado para smoke test.

## 5) Rodar local
```bash
pnpm dev
```
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (use /admin/login e ADMIN_PASSWORD)

## 6) Deploy na Vercel
- Adicione as mesmas variaveis de ambiente no projeto da Vercel.
- Faca deploy normalmente.

## 7) Estrutura de rotas
- Home: `/`
- Silo: `/{silo}`
- Post: `/{silo}/{slug}`
- Admin: `/admin`
- Novo post: `/admin/new`
- Editor: `/admin/editor/{postId}`
- Login admin: `/admin/login`

## 8) Testes
Para rodar os testes automatizados:
```bash
pnpm test
```

## 9) Compliance (Amazon Associates)
- O site inclui um componente de aviso para afiliados no rodape.
- O editor facilita inserir links com `nofollow` e `sponsored`.
