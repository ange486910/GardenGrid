# Process Notes - GardenGrid

## Decisions so far

- **Rotation is family-based over three years.** `rotationConflict` compares the crop family of every planting in the same plot within a rolling three-year window; this is stricter than crop-level comparison and mirrors common bed-rotation practice.
- **Sowing windows are frost-relative.** Hardy crops are sown 4-2 weeks before the last frost; tender crops 1-3 weeks after. Absolute dates would not survive a zone change.
- **Harvest quantities are REAL.** kg and g need decimals, so the column is REAL rather than integer; `count` and `bunch` are treated as whole units by convention.
- **Companion rules are static for now.** The catalogue is code so it can be reviewed in a diff; a database-backed version is listed in the roadmap.
- **Style gate.** `scripts/style-check.mjs` rejects lines over 200 characters, filler comments, emoji and untracked TODO/FIXME markers.

## Evidence

- `node scripts/verify.mjs` runs baseline, style, syntax and the full test suite.
- `node scripts/status.mjs` reports progress against 7 milestones / 10,500 lines / 100 files / 30 commits.
- `node scripts/milestone-check.mjs` validates tagged milestone ranges once they exist.
