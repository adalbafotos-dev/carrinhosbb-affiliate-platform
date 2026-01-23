-- Add advanced editor fields to posts

alter table public.posts
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists seo_title text,
  add column if not exists canonical_path text,
  add column if not exists entities text[] default '{}'::text[],
  add column if not exists supporting_keywords text[] default '{}'::text[],
  add column if not exists schema_type text default 'article',
  add column if not exists hero_image_url text,
  add column if not exists hero_image_alt text,
  add column if not exists og_image_url text,
  add column if not exists images jsonb default '[]'::jsonb,
  add column if not exists author_name text,
  add column if not exists status text default 'draft',
  add column if not exists published boolean default false,
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_at timestamptz,
  add column if not exists faq_json jsonb,
  add column if not exists howto_json jsonb,
  add column if not exists expert_name text,
  add column if not exists expert_role text,
  add column if not exists expert_bio text,
  add column if not exists expert_credentials text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists sources jsonb default '[]'::jsonb,
  add column if not exists disclaimer text,
  add column if not exists amazon_products jsonb default '[]'::jsonb;

update public.posts
  set schema_type = 'article'
where schema_type is null;

update public.posts
  set supporting_keywords = '{}'::text[]
where supporting_keywords is null;

update public.posts
  set entities = '{}'::text[]
where entities is null;

update public.posts
  set images = '[]'::jsonb
where images is null;

update public.posts
  set sources = '[]'::jsonb
where sources is null;

update public.posts
  set faq_json = '[]'::jsonb
where faq_json is null;

update public.posts
  set howto_json = '[]'::jsonb
where howto_json is null;

update public.posts
  set amazon_products = '[]'::jsonb
where amazon_products is null;

alter table public.posts
  alter column images set default '[]'::jsonb,
  alter column entities set default '{}'::text[],
  alter column supporting_keywords set default '{}'::text[],
  alter column sources set default '[]'::jsonb,
  alter column faq_json set default '[]'::jsonb,
  alter column howto_json set default '[]'::jsonb,
  alter column amazon_products set default '[]'::jsonb,
  alter column status set default 'draft',
  alter column schema_type set default 'article',
  alter column published set default false;

update public.posts
  set status = case
    when published = true then 'published'
    when scheduled_at is not null and scheduled_at > now() then 'scheduled'
    else 'draft'
  end
where status is null;

update public.posts
  set published_at = coalesce(published_at, updated_at)
where published = true and published_at is null;

update public.posts
  set meta_title = coalesce(meta_title, seo_title, title)
where meta_title is null;

update public.posts
  set hero_image_url = coalesce(hero_image_url, cover_image)
where hero_image_url is null and cover_image is not null;

update public.posts
  set og_image_url = coalesce(og_image_url, hero_image_url)
where og_image_url is null and hero_image_url is not null;

update public.posts
  set published = (status = 'published')
where status is not null;

alter table public.posts
  alter column status set not null;

alter table public.posts
  alter column schema_type set not null;

alter table public.posts
  add constraint if not exists posts_status_check
  check (status in ('draft', 'review', 'scheduled', 'published'));

alter table public.posts
  add constraint if not exists posts_schema_type_check
  check (schema_type in ('article', 'review', 'faq', 'howto'));

alter table public.posts
  add constraint if not exists posts_published_status_check
  check ((status = 'published' and published = true) or (status <> 'published' and published = false));

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_scheduled_at_idx on public.posts (scheduled_at);

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
