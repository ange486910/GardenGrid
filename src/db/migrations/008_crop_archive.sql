ALTER TABLE crops ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_crops_archived_at ON crops (archived_at);
