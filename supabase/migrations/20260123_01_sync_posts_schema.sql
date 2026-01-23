-- Sync posts schema for the editor (idempotent)

create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid()
);

alter table public.posts
  add column if not exists silo_id uuid,
  add column if not exists title text,
  add column if not exists slug text,
  add column if not exists target_keyword text,
  add column if not exists content_json jsonb,
  add column if not exists content_html text,
  add column if not exists meta_description text,
  add column if not exists meta_title text,
  add column if not exists seo_title text,
  add column if not exists canonical_path text,
  add column if not exists schema_type text not null default 'article',
  add column if not exists supporting_keywords text[],
  add column if not exists entities text[],
  add column if not exists hero_image_url text,
  add column if not exists hero_image_alt text,
  add column if not exists og_image_url text,
  add column if not exists images jsonb default '[]'::jsonb,
  add column if not exists cover_image text,
  add column if not exists author_name text,
  add column if not exists expert_name text,
  add column if not exists expert_role text,
  add column if not exists expert_bio text,
  add column if not exists expert_credentials text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists sources jsonb default '[]'::jsonb,
  add column if not exists disclaimer text,
  add column if not exists faq_json jsonb,
  add column if not exists howto_json jsonb,
  add column if not exists amazon_products jsonb,
  add column if not exists status text not null default 'draft',
  add column if not exists published boolean default false,
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Ensure optional fields stay nullable (some older scripts set NOT NULL)
alter table public.posts
  alter column faq_json drop not null,
  alter column howto_json drop not null,
  alter column amazon_products drop not null,
  alter column supporting_keywords drop not null,
  alter column images drop not null,
  alter column sources drop not null,
  alter column content_json drop not null,
  alter column content_html drop not null;

-- Align defaults with the canonical schema (safe if already set)
alter table public.posts
  alter column images set default '[]'::jsonb,
  alter column sources set default '[]'::jsonb,
  alter column status set default 'draft',
  alter column schema_type set default 'article',
  alter column published set default false;

create index if not exists posts_slug_idx on public.posts (slug);
create index if not exists posts_silo_id_idx on public.posts (silo_id);
create index if not exists posts_status_idx on public.posts (status);

-- Force PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
