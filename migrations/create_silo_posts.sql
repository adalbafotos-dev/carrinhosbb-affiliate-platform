-- Migration: Create silo_posts table for managing post hierarchy within silos
-- This replaces the direct pillar_rank field with a proper pivot table

CREATE TABLE IF NOT EXISTS silo_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  silo_id TEXT NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Role in the silo
  role TEXT CHECK(role IN ('PILLAR', 'SUPPORT', 'AUX')) DEFAULT 'SUPPORT',
  
  -- Position within the role (1-10, for manual ordering)
  position INTEGER DEFAULT 1,
  
  -- Hierarchical level (0 = pillar, 1 = direct support, 2+ = sub-support)
  level INTEGER DEFAULT 1,
  
  -- Optional: parent post for tree structure
  parent_post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Ensure one post per silo
  UNIQUE(silo_id, post_id)
);

CREATE INDEX idx_silo_posts_silo ON silo_posts(silo_id);
CREATE INDEX idx_silo_posts_post ON silo_posts(post_id);
CREATE INDEX idx_silo_posts_role ON silo_posts(role);

-- Migrate existing pillar_rank to silo_posts
INSERT INTO silo_posts (silo_id, post_id, role, position, level)
SELECT 
  silo_id,
  id as post_id,
  CASE 
    WHEN pillar_rank = 1 THEN 'PILLAR'
    WHEN pillar_rank > 1 AND pillar_rank <= 5 THEN 'SUPPORT'
    ELSE 'AUX'
  END as role,
  COALESCE(pillar_rank, 99) as position,
  CASE 
    WHEN pillar_rank = 1 THEN 0
    ELSE 1
  END as level
FROM posts
WHERE silo_id IS NOT NULL
ON CONFLICT(silo_id, post_id) DO NOTHING;
