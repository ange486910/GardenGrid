# Roadmap - GardenGrid

1. **Fallow and cover-crop rotation:** `rotationConflict` only compares crop families. Add a `fallow` planting type and a configurable rest period so a bed can be deliberately left empty without counting as a rotation violation.

2. **User-defined companion rules:** `COMPANION_RULES` is a hard-coded array. Add a `companion_rules` table with a seed migration and CRUD endpoints; the matcher then takes the table rows instead of the constant.

3. **Calendar filtering by plot:** `calendarEvents` returns every plot. Add a `plotId` parameter to the domain function and a `--plot` option to the `calendar` CLI command.

4. **Automatic backup rotation:** manual garden backups are now verified, but no retention scheduler exists. Add daily snapshots and remove old files only after a new restore check succeeds.

5. **Succession plan persistence:** `successionPlan` currently returns calculated dates without creating plantings. Add a reviewed bulk-create command that records the selected rounds and writes their rotation snapshots atomically.

6. **Bed order editing:** beds remain ordered by name. Add drag or keyboard ordering that persists a user-defined sequence without weakening the current roving-focus behavior.
