-- Requisitos:
-- - Este schema segue a lógica de Silos e Posts conforme especificado.
-- - Ele usa gen_random_uuid() (extensão pgcrypto).

create extension if not exists "pgcrypto";

-- Tabela de Silos (Categorias Mãe para URL: site.com/silo/post)
create table if not exists public.silos (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Tabela de Posts
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  silo_id uuid references public.silos(id) on delete set null,
  title text not null, -- H1
  slug text not null unique, -- URL
  target_keyword text not null, -- KGR Principal

  -- Conteúdo Tiptap (JSON para edição, HTML para renderização)
  content_json jsonb, 
  content_html text,

  -- SEO
  seo_score int default 0,
  supporting_keywords text[], -- Palavras que DEVEM aparecer no texto
  meta_description text,
  seo_title text,
  cover_image text,
  author_name text,
  scheduled_at timestamptz,

  -- Integração Amazon (cache dos itens citados no post)
  amazon_products jsonb,

  published boolean default false,
  updated_at timestamptz default now()
);

create index if not exists posts_silo_id_idx on public.posts (silo_id);
create index if not exists posts_updated_at_idx on public.posts (updated_at desc);
