CREATE TABLE rest_periods (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fallow', 'cover_crop')),
  crop_id TEXT,
  started_on TEXT NOT NULL,
  ended_on TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  CHECK (ended_on >= started_on),
  CHECK ((kind = 'cover_crop' AND crop_id IS NOT NULL) OR (kind = 'fallow' AND crop_id IS NULL)),
  FOREIGN KEY (plot_id) REFERENCES plots (id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops (id)
);

CREATE INDEX idx_rest_periods_plot_dates ON rest_periods (plot_id, started_on, ended_on);
