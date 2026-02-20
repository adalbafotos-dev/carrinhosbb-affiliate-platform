-- Enforce at most one PILLAR per silo at database level.

with ranked as (
  select
    id,
    silo_id,
    row_number() over (
      partition by silo_id
      order by updated_at desc nulls last, id asc
    ) as rn
  from public.posts
  where silo_id is not null
    and silo_role = 'PILLAR'
)
update public.posts as p
set silo_role = 'SUPPORT',
    updated_at = now()
from ranked
where p.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists idx_posts_unique_pillar_per_silo
  on public.posts (silo_id)
  where silo_id is not null and silo_role = 'PILLAR';

