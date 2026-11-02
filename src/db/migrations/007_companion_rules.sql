CREATE TABLE IF NOT EXISTS companion_rules (
  id TEXT PRIMARY KEY,
  crop_a TEXT NOT NULL,
  crop_b TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('companion', 'antagonist')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (crop_a, crop_b)
);

CREATE INDEX IF NOT EXISTS idx_companion_rules_type ON companion_rules (type);
