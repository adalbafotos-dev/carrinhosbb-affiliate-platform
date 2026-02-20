-- Add role/order fields directly to posts for editor-driven organization.

alter table if exists public.posts
  add column if not exists silo_role text,
  add column if not exists silo_order int default 0;

alter table if exists public.posts
  drop constraint if exists posts_silo_role_check;

alter table if exists public.posts
  add constraint posts_silo_role_check check (silo_role in ('PILLAR', 'SUPPORT', 'AUX') or silo_role is null);

update public.posts
set silo_order = coalesce(silo_order, silo_group_order, 0)
where silo_order is null;

do $$
begin
  if to_regclass('public.silo_posts') is not null then
    update public.posts as p
    set
      silo_role = upper(coalesce(sp.role, p.silo_role)),
      silo_order = coalesce(sp.position, p.silo_order, 0),
      show_in_silo_menu = case
        when upper(coalesce(sp.role, '')) = 'AUX' then false
        else coalesce(p.show_in_silo_menu, true)
      end
    from public.silo_posts as sp
    where sp.post_id = p.id
      and sp.silo_id = p.silo_id;
  end if;
end $$;

create index if not exists idx_posts_silo_role on public.posts (silo_id, silo_role);
create index if not exists idx_posts_silo_order on public.posts (silo_id, silo_group, silo_order, updated_at desc);
