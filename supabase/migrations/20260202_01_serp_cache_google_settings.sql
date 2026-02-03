-- Google Custom Search settings + SERP cache

create table if not exists public.google_cse_settings (
  id uuid primary key default gen_random_uuid(),
  api_key text,
  cx text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.serp_cache (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  gl text,
  hl text,
  num integer,
  start integer,
  items jsonb not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists serp_cache_query_idx on public.serp_cache (query);
create index if not exists serp_cache_created_idx on public.serp_cache (created_at desc);

notify pgrst, 'reload schema';
