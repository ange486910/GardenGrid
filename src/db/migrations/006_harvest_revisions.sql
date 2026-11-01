CREATE TABLE IF NOT EXISTS harvest_revisions (
  id TEXT PRIMARY KEY,
  harvest_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('updated', 'deleted')),
  before_json TEXT NOT NULL,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_harvest_revisions_harvest ON harvest_revisions (harvest_id, created_at);
