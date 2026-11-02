# Delivery Plan - GardenGrid

## Current position

This document records work completed through Day 16. Milestone tags remain intentionally unfrozen
until the final contiguous ranges have been chosen from reviewed commits.

- Current baseline candidate: `e198001` (`chore: add day-one compliance audit and hard gates`).
  A clean export of this commit passed `scripts/verify.mjs` without network access.
- The original scaffold commit is not a valid selected starting point because its README references
  application and verification scripts that do not exist in that tree.
- Final milestone count, exact hashes, PRD notes and tag names are deferred until final acceptance.

## Completed work

- D1-D5: plots, crops, plantings, rotation rules, SQLite, API and CLI.
- D6: frost profiles, sowing windows, succession schedules and harvest records.
- D7-D8: yield projection, checksummed season exports, previews and atomic imports.
- D9-D10: browser bed board, guarded forms and keyboard navigation.
- D11: garden backup/restore plus retained harvest revisions.
- D12: plot-filtered calendars, companion-rule CRUD and crop archive state.
- D13: succession batch persistence with rotation snapshots and provenance.
- D14: fallow and cover-crop rest periods with bed occupancy protection.
- D15: checksum-bound season conflict templates and reviewed replacement/skip application.
- D16: durable bed display order with keyboard movement, API and CLI support.

## Acceptance targets

- Every feature has domain, persistence, API, CLI or browser evidence as applicable.
- Imports and bed-order writes are all-or-nothing inside a database transaction.
- Two consecutive full test runs pass before a milestone candidate is accepted.
- Final milestone notes must include start/end hashes, failing-at-start and passing-at-end assertions,
  alternatives, interface changes, compatibility notes, limitations and unrelated-change disclosure.
- Adjacent milestone ranges share one boundary commit.

## Open release work

- Resolve the remaining roadmap items for automatic backup rotation and plot-level harvest targets.
- Recheck README instructions against the selected starting commit.
- Run two clean-export acceptance passes from the same directory before final milestone selection.
