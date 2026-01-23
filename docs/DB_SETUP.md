# Supabase - preparando o banco para o Cockpit

A migration chave do editor e `supabase/migrations/20260122_01_add_post_editor_fields.sql`. Ela adiciona colunas como `meta_title`, `schema_type`, `expert_name`, `expert_bio`, `reviewed_at`, `sources`, `status` e `amazon_products`.

## Como aplicar as migrations

### Opcao 1 - Supabase Dashboard (SQL Editor)
1) Abra o SQL Editor no painel do Supabase.  
2) Cole todo o conteudo de `supabase/migrations/20260122_01_add_post_editor_fields.sql` e execute.  
3) Em seguida, force o recarregamento do schema do PostgREST:
```sql
NOTIFY pgrst, 'reload schema';
```

### Opcao 2 - Supabase CLI
1) No terminal, dentro do projeto:
```bash
supabase link
supabase db push
```
2) Para garantir que o PostgREST recarregou o schema, rode o NOTIFY no SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```

## Se voce ja tem uma tabela posts
Se a tabela `public.posts` ja existia e voce esta vendo erros de coluna ausente ou constraints (ex.: `faq_json`, `supporting_keywords`, `amazon_products`), rode a migration de sincronizacao:

1) No SQL Editor do Supabase, cole o conteudo de `supabase/migrations/20260123_01_sync_posts_schema.sql` e execute.  
2) Em seguida, force o recarregamento do schema:
```sql
NOTIFY pgrst, 'reload schema';
```

## Conferindo se as colunas existem
Rode no SQL Editor:
```sql
select column_name
from information_schema.columns
where table_schema='public'
  and table_name='posts'
  and column_name in (
    'meta_title','seo_title','schema_type','canonical_path','entities','supporting_keywords',
    'hero_image_url','hero_image_alt','og_image_url','images',
    'author_name','expert_name','expert_role','expert_bio','expert_credentials',
    'reviewed_by','reviewed_at','sources','disclaimer',
    'faq_json','howto_json','status','published','published_at','scheduled_at','amazon_products'
  );
```
Se as linhas aparecerem, o schema esta pronto e o cockpit consegue criar/editar posts.
