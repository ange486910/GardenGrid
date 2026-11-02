ALTER TABLE plots ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_plots_display_order ON plots (display_order ASC, name ASC);
