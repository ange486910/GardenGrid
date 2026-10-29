CREATE TABLE IF NOT EXISTS harvests (
  id TEXT PRIMARY KEY,
  planting_id TEXT NOT NULL,
  harvested_on TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'count', 'bunch')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (planting_id) REFERENCES plantings (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_harvests_planting ON harvests (planting_id);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests (harvested_on);
