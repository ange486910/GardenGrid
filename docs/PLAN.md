# Delivery Plan - GardenGrid

## Targets

- 7 contiguous milestones. Each must change >=1500 code lines across >=10 code files.
- >=100 non-Markdown code files and >=30 commits.
- M1 starts at the repository root commit and must be buildable offline.
- D1-D5 are implemented and covered by tests; milestone boundaries remain unfrozen until final sizing.
- D6 adds crop-level sowing offsets and succession schedules constrained by each crop's frost window.

## Milestones

### M1 - Plots, crops and planting rules (D1-D2)

Objective: plot/crop/planting domain rules, rotation conflict detection, calendar.

- Start: root commit. End: `m1`.
- Failing-at-start assertion: `node --test tests/domain` cannot run because the domain modules do not exist.
- Passing-at-end assertion: `node --test tests/domain` passes, including the three-year rotation case.

### M2 - Persistence and HTTP API (D2-D3)

Objective: SQLite schema, repositories, HTTP envelope, CLI.

- Start: `m1`. End: `m2`.
- Failing-at-start assertion: `node tests/persistence/garden-repository.test.js` fails (no migration).
- Passing-at-end assertion: the same file passes; `GET /api/v1/health` returns 200.

### M3 - Frost profiles and sowing windows (D3-D4)

Objective: frost profiles, crop-specific sowing windows and succession plans, harvest records and yield summary.

- Start: `m2`. End: `m3`.
- Failing-at-start assertion: `/api/v1/frost-profiles` returns 404.
- Passing-at-end assertion: frost windows honor per-crop offsets, succession rounds stay inside the window, and `/api/v1/yield` aggregates harvests by crop and unit.

### M4 - Advanced rules: companions and rotation history (D5-D6)

Objective: companion/antagonist detection and a three-year rotation report per plot.

- Start: `m3`. End: `m4`.
- Failing-at-start assertion: `/api/v1/companions` returns 404.
- Passing-at-end assertion: the report lists the antagonist pair before the companion pair, blocks families from the previous three years, and rolls back a planting when its history snapshot cannot be written.

### M5 - Season analytics and export (D7-D8)

Objective: season calendar export and yield/rotation summaries with round-trip checks.

- Start: `m4`. End: `m5`.
- Failing-at-start assertion: no export endpoint exists.
- Passing-at-end assertion: the exported season plan re-imports with identical plantings and harvest totals.

### M6 - Browser workspace (D9-D10)

Objective: plot, crop, calendar and harvest views with DOM interaction tests.

- Start: `m5`. End: `m6`.
- Failing-at-start assertion: no web assets are served.
- Passing-at-end assertion: `GET /` returns 200 and the DOM interaction suite passes.

### M7 - Hardening, acceptance and release (D11-D13)

Objective: Docker, CI, security and accessibility gates, acceptance audit, release tag.

- Start: `m6`. End: `m7`.
- Failing-at-start assertion: `node scripts/verify.mjs` is missing CI and acceptance steps.
- Passing-at-end assertion: `verify.mjs` and `milestone-check.mjs` both pass.

## Boundary rules

- The start commit of each milestone is the end commit of the previous one; M1 starts at the root commit.
- A boundary is placed where a requirement is complete and testable, not at a fixed day count.
- Unrelated commits inside a range are disclosed in that milestone note.
- Final boundaries are chosen from real commits after the code is written.
