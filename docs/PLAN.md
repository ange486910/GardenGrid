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

## Milestones (boundaries fixed at the end)

Six content milestones. Their exact commit boundaries are chosen from real commits **after** the code is written, so every block changes **>=1500 code lines across >=10 code files**:

1. Foundation and core workflow
2. Records and derived reports
3. Advanced domain rules
4. Analytics and export
5. Browser workspace
6. Hardening, acceptance and release

No milestone tag is created until its block meets the floor. Tags are `m1` ... `m6` and must be contiguous (`m1` end = `m2` start, and so on).

## Hard gates

- At least 30 commits and 100 non-Markdown code files by D13.
- No source change after the last milestone tag; later commits may only edit Markdown, proven with `git diff --numstat m6..HEAD -- '*.js' '*.mjs' '*.cjs' '*.sql' '*.css' '*.html'`.
- Every commit includes a non-Markdown code, test, script, CI, or infrastructure change.
- The full suite must pass twice in the same checkout without manual cleanup.
- Multi-write flows must be transactional and covered by a failure-injection regression test.
- Dates are real; no backfilled or fabricated history.

