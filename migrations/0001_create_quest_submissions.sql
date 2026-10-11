CREATE TABLE quest_submissions (
  id BIGSERIAL PRIMARY KEY,
  explorer_id TEXT NOT NULL,
  quest_title TEXT NOT NULL,
  media_key TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_bytes INTEGER NOT NULL,
  reflection TEXT NOT NULL,
  checklist_complete BOOLEAN NOT NULL DEFAULT false,
  evaluation_status TEXT NOT NULL DEFAULT 'pending',
  evaluation_note TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_quest_submissions_explorer ON quest_submissions(explorer_id, created_at DESC);