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
  meta_title text,
  meta_description text,
  hero_image_url text,
  hero_image_alt text,
  pillar_content_json jsonb,
  pillar_content_html text,
  menu_order int default 0,
  is_active boolean default true,
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
  meta_title text,
  canonical_path text,
  entities text[],
  faq_json jsonb,
  howto_json jsonb,
  schema_type text not null default 'article',
  cover_image text,
  hero_image_url text,
  hero_image_alt text,
  og_image_url text,
  images jsonb default '[]'::jsonb,
  intent text,
  pillar_rank int default 0,
  is_featured boolean default false,
  author_name text,
  expert_name text,
  expert_role text,
  expert_bio text,
  expert_credentials text,
  reviewed_by text,
  reviewed_at timestamptz,
  sources jsonb default '[]'::jsonb,
  disclaimer text,
  scheduled_at timestamptz,
  published_at timestamptz,
  status text not null default 'draft',

  -- Integração Amazon (cache dos itens citados no post)
  amazon_products jsonb,

  published boolean default false,
  updated_at timestamptz default now()
);

create index if not exists posts_silo_id_idx on public.posts (silo_id);
create index if not exists posts_updated_at_idx on public.posts (updated_at desc);
create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_scheduled_at_idx on public.posts (scheduled_at);

alter table public.posts
  add constraint if not exists posts_status_check
  check (status in ('draft', 'review', 'scheduled', 'published'));

alter table public.posts
  add constraint if not exists posts_schema_type_check
  check (schema_type in ('article', 'review', 'faq', 'howto'));

alter table public.posts
  add constraint if not exists posts_published_status_check
  check ((status = 'published' and published = true) or (status <> 'published' and published = false));

-- Guardian do Silo: batches e indice de links
create table if not exists public.silo_batches (
  id uuid primary key default gen_random_uuid(),
  silo_id uuid references public.silos(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.silo_batch_posts (
  batch_id uuid references public.silo_batches(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (batch_id, post_id)
);

create table if not exists public.post_links (
  id uuid primary key default gen_random_uuid(),
  source_post_id uuid references public.posts(id) on delete cascade,
  target_post_id uuid references public.posts(id) on delete set null,
  target_url text,
  anchor_text text,
  link_type text not null,
  rel_flags text[] default '{}'::text[],
  is_blank boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists post_links_source_idx on public.post_links (source_post_id);
create index if not exists post_links_target_idx on public.post_links (target_post_id);
create index if not exists silo_batches_silo_idx on public.silo_batches (silo_id);
