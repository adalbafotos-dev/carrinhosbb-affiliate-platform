-- WordPress adapter support tables (Contentor integration)

create table if not exists public.wp_app_passwords (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text,
  password_hash text not null,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create index if not exists wp_app_passwords_username_idx on public.wp_app_passwords (username);
create index if not exists wp_app_passwords_active_idx on public.wp_app_passwords (is_active);

create table if not exists public.wp_id_map (
  id bigserial primary key,
  entity_type text not null,
  entity_uuid uuid,
  entity_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists wp_id_map_uuid_unique
  on public.wp_id_map (entity_type, entity_uuid)
  where entity_uuid is not null;

create unique index if not exists wp_id_map_key_unique
  on public.wp_id_map (entity_type, entity_key)
  where entity_key is not null;

create table if not exists public.wp_media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt_text text,
  title text,
  created_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists excerpt text,
  add column if not exists imported_source text,
  add column if not exists imported_at timestamptz,
  add column if not exists raw_payload jsonb;

notify pgrst, 'reload schema';