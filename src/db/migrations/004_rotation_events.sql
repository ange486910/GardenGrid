CREATE TABLE IF NOT EXISTS rotation_events (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  crop_id TEXT NOT NULL,
  family TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  planted_on TEXT NOT NULL,
  ended_on TEXT,
  created_at TEXT NOT NULL,
  CHECK (ended_on IS NULL OR ended_on >= planted_on),
  FOREIGN KEY (plot_id) REFERENCES plots (id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_rotation_events_plot_date ON rotation_events (plot_id, planted_on);
CREATE INDEX IF NOT EXISTS idx_rotation_events_family ON rotation_events (family);

INSERT OR IGNORE INTO rotation_events (id, plot_id, crop_id, family, crop_name, planted_on, ended_on, created_at)
SELECT
  'rotation_' || plantings.id,
  plantings.plot_id,
  plantings.crop_id,
  crops.family,
  crops.name,
  plantings.planted_on,
  CASE WHEN plantings.status = 'harvested' THEN plantings.expected_harvest_on ELSE NULL END,
  plantings.created_at
FROM plantings
JOIN crops ON crops.id = plantings.crop_id;
