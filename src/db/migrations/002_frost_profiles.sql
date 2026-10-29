CREATE TABLE IF NOT EXISTS frost_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  last_frost_date TEXT NOT NULL,
  first_frost_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_frost_profiles_zone ON frost_profiles (zone);
