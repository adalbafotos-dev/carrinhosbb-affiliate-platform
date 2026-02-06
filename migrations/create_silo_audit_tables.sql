-- Migration: Create silo audit tables
-- These tables store audit results for silo health and link quality

-- Main silo audit table
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

-- Link audit results (one per occurrence)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_silo_audits_silo ON silo_audits(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_audits_fingerprint ON silo_audits(fingerprint);
CREATE INDEX IF NOT EXISTS idx_silo_audits_created ON silo_audits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_audits_silo_audit ON link_audits(silo_audit_id);
CREATE INDEX IF NOT EXISTS idx_link_audits_occurrence ON link_audits(occurrence_id);

-- Comments
COMMENT ON TABLE silo_audits IS 'Cached audit results for silo health and structure';
COMMENT ON COLUMN silo_audits.fingerprint IS 'Hash of silo state for cache invalidation';
COMMENT ON COLUMN silo_audits.health_score IS 'Overall silo health score (0-100)';
COMMENT ON COLUMN silo_audits.summary IS 'JSON summary with counts, percentages, etc';
COMMENT ON COLUMN silo_audits.issues IS 'JSON array of issues with severity and actions';

COMMENT ON TABLE link_audits IS 'Quality audit for individual link occurrences';
COMMENT ON COLUMN link_audits.score IS 'Link quality score (0-100)';
COMMENT ON COLUMN link_audits.label IS 'Quality label: STRONG (80-100), OK (50-79), WEAK (0-49)';
COMMENT ON COLUMN link_audits.reasons IS 'JSON array of reason codes (ANCHOR_GENERIC, SEMANTIC_MATCH, etc)';
COMMENT ON COLUMN link_audits.suggested_anchor IS 'AI-generated suggestion for better anchor';
