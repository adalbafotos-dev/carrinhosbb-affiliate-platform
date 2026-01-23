-- Guardian do Silo: staging e indice de links

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
  rel_flags text[] default '{}',
  is_blank boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists post_links_source_idx on public.post_links (source_post_id);
create index if not exists post_links_target_idx on public.post_links (target_post_id);
create index if not exists silo_batches_silo_idx on public.silo_batches (silo_id);
