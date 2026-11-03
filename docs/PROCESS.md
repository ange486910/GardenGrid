# Process Notes - GardenGrid

This document records non-obvious decisions, alternatives, consequences and verification evidence.

## 1. Keep bed rest separate from rotation families

**Problem.** Fallow periods and cover crops reserve bed dates but should not create false crop-family
conflicts.

**Alternatives.**

1. Insert fake plantings. This pollutes harvest and rotation data.
2. Allow overlapping commitments. This permits impossible schedules.
3. Store rest periods explicitly and check both rest/rest and rest/planting overlaps.

**Decision.** Use option 3. Rest records reserve bed dates without entering crop-family history.

**Consequences.** A bed cannot be both resting and planted. Rest days can be summarized without being
reported as rotation blocks.

**Verification.** Domain tests cover date overlap; service tests reject conflicts; backup tests restore
the complete rest history.

## 2. Repair imports with a checksum-bound review file

**Problem.** A conflict preview alone gives users no safe way to continue.

**Alternatives.**

1. Auto-shift dates. This changes an agronomic plan without review.
2. Mutate the signed package. The applied data would no longer match its checksum.
3. Apply a separate replacement/skip file after a fresh preview token.

**Decision.** Use option 3. The resolution file is bound to the package checksum and the token also
covers current conflicts.

**Consequences.** Any bed change after preview requires another preview. Templates default to skip
entries; date or plot changes remain explicit user decisions.

**Verification.** Tests cover replacement, cascading skips, stale preview rejection, API/CLI apply and
template generation.

## 3. Store bed order by id, not by name

**Problem.** Alphabetic names cannot match the physical walking order of a garden.

**Alternatives.**

1. Sort only in the browser. The order disappears on refresh.
2. Permit duplicate order values. The result becomes nondeterministic.
3. Require the complete set of bed ids when reordering and assign contiguous positions.

**Decision.** Use option 3. Alt+Arrow moves beds in the browser; the API and CLI share validation.

**Consequences.** Reordering rewrites all beds, which is cheap at garden scale. New beds sort by name
until the next reorder.

**Verification.** Domain tests reject incomplete sets; repository, API, CLI and browser tests assert
persisted order; backup tests preserve it.

## 4. Targets are keyed by bed, crop, season and unit

**Problem.** A single plot-level total cannot tell whether tomatoes or lettuce met their goals, and
kilograms cannot be compared with counts.

**Alternatives.**

1. Store one target per bed regardless of crop. This hides crop mix.
2. Store targets per crop globally. It cannot compare bed performance.
3. Store one target per bed, crop, season and unit and calculate variance against matching yield rows.

**Decision.** Use option 3. Actual yield is filtered to the season, grouped by the existing yield
projection, and matched on the same key.

**Consequences.** Different units remain independent. A missing matching harvest reports zero actual
quantity rather than a made-up conversion.

**Verification.** Domain tests validate keys and variance; service/API tests compare harvest and target;
CLI and browser checks use the same report; backup tests preserve targets.

## 8. Export calendar events as a portable feed

**Problem.** Garden dates were visible only inside the local page and JSON calendar endpoint.

**Alternatives.**

1. Generate a one-off text file in the browser. It cannot be refreshed by a calendar client.
2. Store a generated feed in the database. It would duplicate derived data and drift after edits.
3. Derive an iCalendar response from the existing calendar query and give each planting event a stable UID.

**Decision.** Use option 3. The API, CLI and browser all call the same range query. Event UIDs are based on
type, planting id and date, while generated timestamps stay outside the UID.

**Consequences.** Calendar clients can refresh the feed without duplicate events. Missing ranges and
reversed dates are rejected by the existing calendar validation.

**Verification.** Domain tests cover escaping, UTF-8 folding, CRLF output and an empty feed; API tests
cover content type, download name, plot filtering and invalid ranges; CLI and browser tests cover both
entrypoints.

## Evidence commands
```powershell
node scripts/baseline-check.mjs
node scripts/verify.mjs
node scripts/audit.mjs
```

## Known limitations

- The forecast is a simple target comparison, not a crop-yield prediction.
- Drag-and-drop is intentionally absent; Alt+Arrow is the primary ordering interaction.
- Interaction guidance remains engineering data, not horticultural advice.
## 5. Verify a new garden snapshot before pruning old ones

**Problem.** Deleting an older backup before the newest file and sidecar are verified can turn a
partial write into permanent data loss.

**Alternatives.**

1. Write and prune in one unchecked pass.
2. Keep every snapshot forever.
3. Write atomically, validate the backup and sidecar, then apply retention.

**Decision.** Use option 3. Dry-run reports scheduling and retention without touching the directory.

**Consequences.** Failed verification leaves every old snapshot intact. CLI and the standalone job use
the same maintenance path.

**Verification.** Application tests assert dry-run writes nothing and completed snapshots have sidecars;
CLI and job tests cover both dry and write modes.
## 7. Treat CI and repository policy as executable project code

**Problem.** Local verification alone does not protect `master`; security reporting and review ownership
can also drift from the repository.

**Decision.** CI runs security checks and the full suite twice on Linux and Windows. A Windows workflow
runs browser tests, CodeQL scans JavaScript, and release tooling checks repository policy and changelog.

**Consequences.** Platform-specific browser failures and policy drift are visible before merge.