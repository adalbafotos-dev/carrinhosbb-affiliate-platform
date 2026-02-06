-- MIGRATION COMPLETA: Setup inicial para Silo Map
-- Execute TUDO de uma vez no Supabase SQL Editor

-- ============================================
-- 1. Tabela silo_posts (Hierarquia)
-- ============================================
CREATE TABLE IF NOT EXISTS silo_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('PILLAR', 'SUPPORT', 'AUX')),
  position INTEGER,
  level INTEGER DEFAULT 0,
  parent_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(silo_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_silo_posts_silo ON silo_posts(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_posts_post ON silo_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_silo_posts_role ON silo_posts(role);

-- ============================================
-- 2. Tabela post_link_occurrences (Links)
-- ============================================
CREATE TABLE IF NOT EXISTS post_link_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  source_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  target_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  context_snippet TEXT,
  position_bucket TEXT CHECK(position_bucket IN ('START', 'MID', 'END')),
  href_normalized TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_occurrences_silo ON post_link_occurrences(silo_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_source ON post_link_occurrences(silo_id, source_post_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_target ON post_link_occurrences(silo_id, target_post_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_pair ON post_link_occurrences(source_post_id, target_post_id);

-- ============================================
-- 3. Tabelas de Auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS silo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  health_score INTEGER NOT NULL CHECK(health_score >= 0 AND health_score <= 100),
  status TEXT NOT NULL CHECK(status IN ('OK', 'WARNING', 'CRITICAL')),
  summary JSONB NOT NULL DEFAULT '{}',
  issues JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS link_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_audit_id UUID NOT NULL REFERENCES silo_audits(id) ON DELETE CASCADE,
  occurrence_id UUID NOT NULL REFERENCES post_link_occurrences(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
  label TEXT NOT NULL CHECK(label IN ('STRONG', 'OK', 'WEAK')),
  reasons JSONB NOT NULL DEFAULT '[]',
  suggested_anchor TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_silo_audits_silo ON silo_audits(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_audits_fingerprint ON silo_audits(fingerprint);
CREATE INDEX IF NOT EXISTS idx_link_audits_silo_audit ON link_audits(silo_audit_id);
CREATE INDEX IF NOT EXISTS idx_link_audits_occurrence ON link_audits(occurrence_id);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute estas queries para confirmar:
SELECT 'silo_posts' as table_name, COUNT(*) as count FROM silo_posts
UNION ALL
SELECT 'post_link_occurrences', COUNT(*) FROM post_link_occurrences
UNION ALL
SELECT 'silo_audits', COUNT(*) FROM silo_audits
UNION ALL
SELECT 'link_audits', COUNT(*) FROM link_audits;
