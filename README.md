# Plataforma de Nicho (Unhas/Manicure) — Next.js 16 + Supabase + Tiptap

Este repositório é um *starter* pronto para:
- Blog em arquitetura de **silos** (`/silo/post`) com **SSG + ISR** (`revalidate: 3600`)
- CMS interno em `/admin` com **Tiptap** (focado em “Construtor de Reviews”)
- Integração preparada para **Amazon Associates** (links com `rel="sponsored"`)

> Importante: a area `/admin` usa senha simples via cookie httpOnly. Em producao, troque por um fluxo de login completo.

## Stack (fixa)
- Next.js 16.0.7 (App Router, Server Actions)
- React 19.2.1
- Tailwind CSS 4.1.17
- Supabase (PostgreSQL)
- Tiptap (Headless, React)
- Lucide React
- Deploy: Vercel

## 1) Pré-requisitos
- Node.js 20+ (recomendado)
- Conta no Supabase

## 2) Configuração do Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor do Supabase, execute:
   - `supabase/schema.sql`

## 3) Variáveis de ambiente

Crie um arquivo `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)
- `ADMIN_PASSWORD` (senha para /admin/login)
- `ADMIN_DISABLE_AUTH=1` (opcional, libera /admin apenas em ambiente local)
- `SITE_URL` (ex.: https://seusite.com.br)

## 4) Seed inicial (silos + posts)

Após criar as tabelas, rode:
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
- Adicione as mesmas variáveis de ambiente no projeto da Vercel.
- Faça deploy normalmente.

## 7) Estrutura de rotas
- Home: `/`
- Silo: `/{silo}`
- Post: `/{silo}/{slug}`
- Admin: `/admin`
- Editor: `/admin/editor/{postId}`

## 8) Testes
Para rodar os testes automatizados:
```bash
pnpm test
```

## 9) Compliance (Amazon Associates)
- O site já inclui um componente de aviso para afiliados no rodapé.
- O editor facilita inserir links com `nofollow` e `sponsored`.





