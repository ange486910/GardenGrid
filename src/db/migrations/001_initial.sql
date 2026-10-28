CREATE TABLE IF NOT EXISTS plots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area_sqm INTEGER NOT NULL CHECK (area_sqm > 0),
  sun_exposure TEXT NOT NULL CHECK (sun_exposure IN ('full', 'partial', 'shade')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  days_to_harvest INTEGER NOT NULL CHECK (days_to_harvest BETWEEN 1 AND 365),
  frost_hardy INTEGER NOT NULL CHECK (frost_hardy IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plantings (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  crop_id TEXT NOT NULL,
  planted_on TEXT NOT NULL,
  expected_harvest_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'harvested')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (plot_id) REFERENCES plots (id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_plantings_plot ON plantings (plot_id);
CREATE INDEX IF NOT EXISTS idx_plantings_crop ON plantings (crop_id);
CREATE INDEX IF NOT EXISTS idx_plantings_dates ON plantings (planted_on, expected_harvest_on);
