CREATE TABLE succession_batches (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL REFERENCES crops(id),
  profile_id TEXT NOT NULL REFERENCES frost_profiles(id),
  interval_days INTEGER NOT NULL,
  selected_rounds_json TEXT NOT NULL,
  planting_ids_json TEXT NOT NULL,
  rotation_event_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_succession_batches_created_at ON succession_batches (created_at DESC, id DESC);
