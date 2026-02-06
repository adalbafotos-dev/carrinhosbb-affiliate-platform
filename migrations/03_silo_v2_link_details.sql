-- Adiciona detalhes de atributos de link na tabela de ocorrências
ALTER TABLE post_link_occurrences 
ADD COLUMN IF NOT EXISTS link_type TEXT CHECK (link_type IN ('INTERNAL', 'EXTERNAL', 'AFFILIATE')) DEFAULT 'INTERNAL',
ADD COLUMN IF NOT EXISTS is_nofollow BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_ugc BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_blank BOOLEAN DEFAULT false;

-- Permite target_post_id nulo para suportar links externos
ALTER TABLE post_link_occurrences 
ALTER COLUMN target_post_id DROP NOT NULL;
