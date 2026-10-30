# GardenGrid 7-Day Plan

| Day | Deliverable | Acceptance |
| --- | --- | --- |
| D1 | Plots, crops, plantings, rotation check, calendar, API, CLI | `node --test` green; calendar covers plant and harvest events |
| D2 | Frost-date profiles and sowing windows | window tests per frost profile (done) |
| D3 | Harvest logging and yield records | yield summary tests (done) |
| D4 | Crop companions and conflict warnings | companion rule tests (done) |
| D5 | Bed rotation history and 3-year report | rotation report tests |
| D6 | Browser workspace (plots/crops/calendar) | DOM interaction tests |
| D7 | Docker, CI, acceptance audit, dual-remote release | `verify` green + release tag |

Each day lands at least five focused commits; no generated or duplicated code.

## Hard gates (platform review rules)

- At least 30 commits and 100 non-Markdown code files by Day 7.
- At least 6 contiguous milestones; every milestone must change >=1500 code lines across >=10 code files.
- Each milestone has one delivery objective and a `command -> expected output` acceptance list.
- No source change after the last milestone end; later commits may only edit Markdown, proven with `git diff --numstat <end>..HEAD -- '*.js' '*.mjs' '*.cjs' '*.sql' '*.css' '*.html'`.
- Every commit includes a non-Markdown code, test, script, CI, or infrastructure change.
- The full suite must pass twice in the same checkout without manual cleanup.
- Multi-write flows must be transactional and covered by a failure-injection regression test.
- Dates are real; no backfilled or fabricated history.
