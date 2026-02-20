-- Dynamic silo groups (create/rename/editorial order per silo).

create extension if not exists pgcrypto;

create table if not exists public.silo_groups (
  id uuid primary key default gen_random_uuid(),
  silo_id uuid not null references public.silos(id) on delete cascade,
  key text not null,
  label text not null,
  menu_order int not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (silo_id, key)
);

create index if not exists idx_silo_groups_silo_order
  on public.silo_groups (silo_id, menu_order, created_at);

-- Seed default groups for every existing silo.
insert into public.silo_groups (silo_id, key, label, menu_order, keywords)
select
  s.id,
  defs.key,
  defs.label,
  defs.menu_order,
  defs.keywords
from public.silos s
cross join (
  values
    ('preco_oportunidade', 'Preco / oportunidade', 10, array['preco','barato','economico','oferta','promocao','custo','beneficio']::text[]),
    ('decisao_escolha', 'Decisao / escolha', 20, array['melhor','escolher','guia','comparativo','qual','vale a pena']::text[]),
    ('tipos', 'Tipos', 30, array['tipos','modelo','berco','passeio','guarda-chuva','travel system']::text[]),
    ('viagem_portabilidade', 'Portabilidade / viagem', 40, array['viagem','portatil','portabilidade','dobravel','aviao','mala']::text[]),
    ('peso_capacidade', 'Peso / capacidade', 50, array['peso','capacidade','kg','suporte','limite']::text[]),
    ('fase_idade', 'Fase / idade', 60, array['idade','fase','meses','anos','recem nascido','crianca']::text[]),
    ('recursos', 'Recursos', 70, array['recurso','funcao','acessorio','conforto','seguranca','ajuste']::text[])
) as defs(key, label, menu_order, keywords)
on conflict (silo_id, key) do nothing;

-- Preserve legacy custom group keys that already exist in posts.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'silo_group'
  ) then
    insert into public.silo_groups (silo_id, key, label, menu_order, keywords)
    select distinct
      p.silo_id,
      p.silo_group as key,
      initcap(replace(p.silo_group, '_', ' ')) as label,
      90 as menu_order,
      array_remove(regexp_split_to_array(lower(replace(p.silo_group, '_', ' ')), '\s+'), '')::text[] as keywords
    from public.posts p
    where p.silo_id is not null
      and p.silo_group is not null
      and btrim(p.silo_group) <> ''
    on conflict (silo_id, key) do nothing;
  end if;
end $$;
