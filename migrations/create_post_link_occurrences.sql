-- Migration: Create post_link_occurrences table
-- This table stores individual link occurrences between posts for the silo map

CREATE TABLE IF NOT EXISTS post_link_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  source_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  target_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  context_snippet TEXT, -- 120-240 chars of surrounding context
  position_bucket TEXT CHECK(position_bucket IN ('START', 'MID', 'END')),
  href_normalized TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_occurrences_silo ON post_link_occurrences(silo_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_source ON post_link_occurrences(silo_id, source_post_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_target ON post_link_occurrences(silo_id, target_post_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_pair ON post_link_occurrences(source_post_id, target_post_id);

-- Comments
COMMENT ON TABLE post_link_occurrences IS 'Individual link occurrences between posts for silo map visualization';
COMMENT ON COLUMN post_link_occurrences.anchor_text IS 'The visible link text';
COMMENT ON COLUMN post_link_occurrences.context_snippet IS 'Surrounding text for context (optional)';
COMMENT ON COLUMN post_link_occurrences.position_bucket IS 'Position in the source post: START (first 33%), MID (middle 33%), END (last 33%)';
COMMENT ON COLUMN post_link_occurrences.href_normalized IS 'Normalized href for debugging';
