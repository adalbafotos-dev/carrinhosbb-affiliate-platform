-- Add lightweight editorial grouping fields to posts for silo hubs and menus.

alter table if exists public.posts
  add column if not exists silo_group text,
  add column if not exists silo_group_order int default 0,
  add column if not exists show_in_silo_menu boolean default true;

-- Keep legacy rows coherent with the expected defaults.
update public.posts
set silo_group_order = coalesce(silo_group_order, 0)
where silo_group_order is null;

update public.posts
set show_in_silo_menu = coalesce(show_in_silo_menu, true)
where show_in_silo_menu is null;

-- Enforce "AUX = hidden from silo menu" for existing hierarchy rows.
do $$
begin
  if to_regclass('public.silo_posts') is not null then
    update public.posts as p
    set show_in_silo_menu = false
    from public.silo_posts as sp
    where sp.post_id = p.id
      and sp.silo_id = p.silo_id
      and upper(coalesce(sp.role, '')) = 'AUX';
  end if;
end $$;

-- Helpful indexes for hub rendering.
create index if not exists idx_posts_silo_group_order
  on public.posts (silo_id, silo_group, silo_group_order, updated_at desc);

create index if not exists idx_posts_silo_menu_visibility
  on public.posts (silo_id, show_in_silo_menu);
