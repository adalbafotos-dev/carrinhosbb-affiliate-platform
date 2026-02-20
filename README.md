# Bebê na Rota -- Affiliate Platform (Next.js + Supabase + Tiptap)

Base de site multi-silo com CMS interno para publicar guias e comparativos.

## O que já vem pronto
- Arquitetura de silos (`/silo/post`) com SSG + ISR
- CMS em `/admin` com editor Tiptap
- Fluxo de links internos, auditoria e importação de conteúdo
- Estrutura para links de afiliados Amazon

## Stack
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (Postgres + Storage)
- Tiptap

## Variáveis de ambiente
Configure em `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_DISABLE_AUTH=1` (opcional para ambiente local)
- `SITE_URL` (opcional; canonical padrão usa `https://bebenarota.com.br`)

## Banco de dados
1. Execute `supabase/schema.sql` no projeto Supabase.
2. Rode o seed:

```bash
pnpm install
pnpm seed
```

O seed atual cria:
- 1 silo público: `mobilidade-e-passeio`
- 7 posts base de carrinho de bebê
- Desativação automática de silos legados fora do seed

## Rodar local
```bash
pnpm dev
```

- Site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Rotas públicas principais
- `/`
- `/mobilidade-e-passeio`
- `/sobre`
- `/politica-editorial`
- `/politica-de-privacidade`
- `/afiliados`
- `/contato`

## Testes
```bash
pnpm test
```
