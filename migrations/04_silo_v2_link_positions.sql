-- Adiciona campos para localizar ocorrencias no editor
ALTER TABLE post_link_occurrences
ADD COLUMN IF NOT EXISTS start_index INTEGER,
ADD COLUMN IF NOT EXISTS end_index INTEGER,
ADD COLUMN IF NOT EXISTS occurrence_key TEXT;

CREATE INDEX IF NOT EXISTS idx_occurrences_key ON post_link_occurrences(occurrence_key);
