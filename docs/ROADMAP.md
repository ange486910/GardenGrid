# Roadmap - GardenGrid

1. **Fallow and cover-crop rotation:** add explicit fallow and cover-crop records with configurable rest periods so a bed can be intentionally left empty without counting as a rotation violation.

2. **Season import conflict repair:** imports report occupied date ranges but cannot apply reviewed substitutions. Add an explicit replacement file applied atomically after a successful preview.

3. **Succession plan persistence:** `successionPlan` returns calculated dates without creating plantings. Add a reviewed bulk-create command that writes all selected rounds and their rotation snapshots together.

4. **Bed order editing:** beds remain ordered by name. Add drag or keyboard ordering that stores a user-defined sequence without weakening roving focus.

5. **Automatic backup rotation:** manual snapshots are verified, but no scheduler invokes them. Add daily retained snapshots and delete old files only after the latest restore check succeeds.

6. **Plot-level harvest targets:** yield is reported after harvest but there are no target quantities by bed. Add seasonal targets with variance reporting and a clear non-medical, planning-only forecast.
