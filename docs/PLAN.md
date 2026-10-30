# 13-Day Delivery Plan

Target: **6 milestones, >=9,000 code lines, >=100 non-Markdown code files, >=30 commits.**

| Day | Deliverable | Milestone |
| --- | --- | --- |
| D1 | Domain rules, SQLite schema, repositories | M1 |
| D2 | HTTP API, CLI, end-to-end tests | M1 |
| D3 | Core record workflow (second domain slice) | M2 |
| D4 | Import or derived report with failure tests | M2 |
| D5 | Advanced domain rules (transfers / rotation history / history import) | M3 |
| D6 | Rule reports + API + CLI + tests | M3 |
| D7 | Analytics and trend reporting | M4 |
| D8 | Export/import round-trip + audit checks | M4 |
| D9 | Web workspace: layout, store, API client | M5 |
| D10 | Web views + DOM interaction tests | M5 |
| D11 | Docker, CI, security and accessibility gates | M6 |
| D12 | Acceptance audit, docs, release manifest | M6 |
| D13 | Final verification, dual-remote release, tag | M6 |

## Milestones

- M1: D1-D2 (foundation and core workflow)
- M2: D3-D4 (records and first report)
- M3: D5-D6 (advanced rules)
- M4: D7-D8 (analytics and export)
- M5: D9-D10 (browser workspace)
- M6: D11-D13 (hardening and release)

Each milestone must be tagged `m1` ... `m6` and must change **>=1500 code lines across >=10 code files**.

## Hard gates

- At least 30 commits and 100 non-Markdown code files by D13.
- No source change after the last milestone tag; later commits may only edit Markdown, proven with `git diff --numstat m6..HEAD -- '*.js' '*.mjs' '*.cjs' '*.sql' '*.css' '*.html'`.
- Every commit includes a non-Markdown code, test, script, CI, or infrastructure change.
- The full suite must pass twice in the same checkout without manual cleanup.
- Multi-write flows must be transactional and covered by a failure-injection regression test.
- Dates are real; no backfilled or fabricated history.
