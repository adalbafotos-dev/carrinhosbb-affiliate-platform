-- Add repair workflow fields to link_audits
ALTER TABLE link_audits
ADD COLUMN IF NOT EXISTS action TEXT,
ADD COLUMN IF NOT EXISTS recommendation TEXT,
ADD COLUMN IF NOT EXISTS spam_risk INTEGER,
ADD COLUMN IF NOT EXISTS intent_match INTEGER;

CREATE INDEX IF NOT EXISTS idx_link_audits_action ON link_audits(action);
CREATE INDEX IF NOT EXISTS idx_link_audits_spam_risk ON link_audits(spam_risk);
