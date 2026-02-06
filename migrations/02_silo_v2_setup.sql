-- Migração Completa para o Silo V2
-- Rode este script no Supabase SQL Editor para habilitar todas as funcionalidades do Painel do Silo.

-- 1. Pivot Table para Hierarquia (Se não existir)
CREATE TABLE IF NOT EXISTS silo_posts (
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('PILLAR', 'SUPPORT', 'AUX')),
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (silo_id, post_id)
);

-- 2. Tabela de Ocorrências de Links (Granular)
CREATE TABLE IF NOT EXISTS post_link_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  source_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  target_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  context_snippet TEXT, -- 120-240 chars ao redor
  position_bucket TEXT CHECK(position_bucket IN ('START', 'MID', 'END')),
  href_normalized TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_occurrences_silo ON post_link_occurrences(silo_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_source ON post_link_occurrences(source_post_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_target ON post_link_occurrences(target_post_id);

-- 3. Tabela de Auditoria do Silo
CREATE TABLE IF NOT EXISTS silo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL, -- Hash do estado para cache
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  status TEXT CHECK (status IN ('OK', 'WARNING', 'CRITICAL')),
  issues JSONB DEFAULT '[]'::JSONB, -- Lista de problemas
  summary JSONB DEFAULT '{}'::JSONB, -- Resumo estatístico
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_silo_audits_silo ON silo_audits(silo_id);

-- 4. Tabela de Auditoria de Links Individuais
CREATE TABLE IF NOT EXISTS link_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  occurrence_id UUID NOT NULL REFERENCES post_link_occurrences(id) ON DELETE CASCADE,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  label TEXT CHECK (label IN ('STRONG', 'OK', 'WEAK')),
  reasons JSONB DEFAULT '[]'::JSONB,
  suggested_anchor TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_audits_occurrence ON link_audits(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_link_audits_silo ON link_audits(silo_id);
