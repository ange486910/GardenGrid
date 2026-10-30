# Roadmap - GardenGrid

1. **Fallow and cover-crop rotation:** `rotationConflict` only compares crop families. Add a `fallow` planting type and a configurable rest period so a bed can be deliberately left empty without counting as a rotation violation.

2. **Per-crop sowing offsets:** `sowingWindow` uses two fixed rules (hardy before frost, tender after). Add `sow_weeks_before_frost` and `sow_weeks_after_frost` columns to `crops` and let the window read them.

3. **Yield by plot:** `yieldSummary` groups by crop and unit only. Add a `byPlot` projection and a `?plotId=` filter on `/api/v1/yield` so a bed-level comparison is possible.

4. **User-defined companion rules:** `COMPANION_RULES` is a hard-coded array. Add a `companion_rules` table with a seed migration and CRUD endpoints; the matcher then takes the table rows instead of the constant.

5. **Harvest correction:** there is no delete or patch endpoint for `harvests`; a mistyped weight requires direct SQL today. Add `PATCH|DELETE /api/v1/harvests/:id` with a `harvest.updated` audit-style event.

6. **Calendar filtering by plot:** `calendarEvents` returns every plot. Add a `plotId` parameter to the domain function and a `--plot` option to the `calendar` CLI command.
