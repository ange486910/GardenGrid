CREATE TABLE harvest_targets (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  crop_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'count', 'bunch')),
  target_quantity REAL NOT NULL CHECK (target_quantity > 0),
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (plot_id, crop_id, season, unit),
  FOREIGN KEY (plot_id) REFERENCES plots (id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops (id) ON DELETE CASCADE
);

CREATE INDEX idx_harvest_targets_season ON harvest_targets (season, plot_id, crop_id);
