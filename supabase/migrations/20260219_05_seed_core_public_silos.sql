-- Core public silos for menu/hub navigation (no 404 in main menu).

alter table if exists public.silos
  add column if not exists show_in_navigation boolean default true;

update public.silos
set show_in_navigation = coalesce(show_in_navigation, true)
where show_in_navigation is null;

create index if not exists idx_silos_public_navigation
  on public.silos (is_active, show_in_navigation, menu_order);

insert into public.silos (
  name,
  slug,
  description,
  pillar_content_html,
  menu_order,
  is_active,
  show_in_navigation
)
values
  (
    'Mobilidade e Passeio',
    'mobilidade-e-passeio',
    'Guias praticos para escolher carrinhos e itens de passeio sem gastar a toa e sem dor de cabeca.',
    '<p>A ideia aqui e simples: ajudar voce a acertar na compra pensando na sua rotina real.</p><p>Orcamento, tamanho, peso, praticidade e o que vale a pena de verdade.</p>',
    1,
    true,
    true
  ),
  (
    'Seguranca Automotiva',
    'seguranca-automotiva',
    'Conteudos diretos para escolher e usar cadeirinha e bebe conforto com mais seguranca e menos duvida.',
    '<p>Sem exagero e sem confusao: criterios de escolha, instalacao, erros comuns e checklists para o dia a dia no carro.</p>',
    2,
    true,
    true
  ),
  (
    'Sono Seguro e Portabilidade',
    'sono-seguro-e-portabilidade',
    'Solucoes para o bebe dormir bem e com seguranca fora de casa, com menos improviso.',
    '<p>Viagem, casa de parentes ou passeio longo: aqui voce encontra checklists e guias para organizar o sono do bebe sem levar a casa inteira.</p>',
    3,
    true,
    true
  ),
  (
    'Ergonomia e Transporte Corporal',
    'ergonomia-e-transporte-corporal',
    'Sling, canguru e carregadores explicados de um jeito simples, com foco em conforto e ergonomia.',
    '<p>Para voce carregar o bebe com mais liberdade e menos dor nas costas.</p><p>Tipos, ajustes e como escolher o modelo certo para sua rotina.</p>',
    4,
    true,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  pillar_content_html = excluded.pillar_content_html,
  menu_order = excluded.menu_order,
  is_active = excluded.is_active,
  show_in_navigation = excluded.show_in_navigation;
