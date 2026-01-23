-- Pillar fields for silos and optional curation flags on posts
alter table public.silos
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists hero_image_url text,
  add column if not exists hero_image_alt text,
  add column if not exists pillar_content_json jsonb,
  add column if not exists pillar_content_html text,
  add column if not exists menu_order int default 0,
  add column if not exists is_active boolean default true;

alter table public.posts
  add column if not exists intent text,
  add column if not exists pillar_rank int default 0,
  add column if not exists is_featured boolean default false;
