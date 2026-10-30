# 13-Day Delivery Plan

Target: **7 milestones, >=10,500 code lines, >=100 non-Markdown code files, >=30 commits.**

| Day | Deliverable |
| --- | --- |
| D1 | Domain rules, SQLite schema, repositories |
| D2 | HTTP API, CLI, end-to-end tests |
| D3 | Core record workflow (second domain slice) |
| D4 | Import or derived report with failure tests |
| D5 | Advanced domain rules (transfers / rotation history / history import) |
| D6 | Rule reports + API + CLI + tests |
| D7 | Analytics and trend reporting |
| D8 | Export/import round-trip + audit checks |
| D9 | Web workspace: layout, store, API client |
| D10 | Web views + DOM interaction tests |
| D11 | Docker, CI, security and accessibility gates |
| D12 | Acceptance audit, docs, release manifest |
| D13 | Final verification, dual-remote release, tag |

## Seven milestones

Milestone boundaries are chosen from real commits after the code is written, so every block changes **>=1500 code lines across >=10 code files**:

1. Foundation and domain rules
2. Persistence and HTTP API
3. Core record workflow
4. Advanced domain rules
5. Analytics and export
6. Browser workspace
7. Hardening, acceptance and release

No tag is created until its block meets the floor. Tags are `m1` ... `m7` and contiguous.

## Hard gates

- At least 30 commits and 100 non-Markdown code files by D13.
- No source change after the last milestone tag; later commits may only edit Markdown, proven with `git diff --numstat m7..HEAD -- '*.js' '*.mjs' '*.cjs' '*.sql' '*.css' '*.html'`.
- Every commit includes a non-Markdown code, test, script, CI, or infrastructure change.
- The full suite must pass twice in the same checkout without manual cleanup.
- Multi-write flows must be transactional and covered by a failure-injection regression test.
- Source files pass `scripts/style-check.mjs`: max 200 characters per line, no filler comments, no emoji, no untracked TODO/FIXME.
- Dates are real; no backfilled or fabricated history.
