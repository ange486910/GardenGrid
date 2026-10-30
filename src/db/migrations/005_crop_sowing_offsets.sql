ALTER TABLE crops ADD COLUMN earliest_sow_weeks INTEGER
  CHECK (earliest_sow_weeks IS NULL OR earliest_sow_weeks BETWEEN -26 AND 26);
ALTER TABLE crops ADD COLUMN latest_sow_weeks INTEGER
  CHECK (latest_sow_weeks IS NULL OR latest_sow_weeks BETWEEN -26 AND 26);
