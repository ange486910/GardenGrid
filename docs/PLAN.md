# Delivery Plan - GardenGrid

## Current position

This document records work completed through Day 18. Milestone boundaries and tags remain
intentionally unfrozen until the final contiguous ranges have been selected and reviewed.

- Current baseline candidate: `e198001` (`chore: add day-one compliance audit and hard gates`).
  A clean export passed `scripts/verify.mjs` without network access.
- The original scaffold commit is not a valid selected starting point because its README references
  files absent from that tree.
- Final milestone count, exact hashes, PRD notes and tag names are deferred until acceptance.

## Completed work

- D1-D5: plots, crops, plantings, rotation rules, SQLite, API and CLI.
- D6-D8: frost windows, succession, harvests, yields, season exports and atomic imports.
- D9-D11: browser board, guarded forms, keyboard navigation and garden backup/restore.
- D12-D13: calendars, companion-rule CRUD, archive state and succession provenance.
- D14-D15: fallow periods and checksum-bound season conflict repairs.
- D16: durable bed order with keyboard, API, CLI and backup support.
- D17: seasonal bed/crop harvest targets, actual-versus-target variance and browser reporting.
- D18: automatic verified garden snapshots with retention, dry-run, CLI and job entrypoint.

## Acceptance targets

- Every feature has domain, persistence, API, CLI or browser evidence as applicable.
- Target quantities and yields must use the same crop, plot and unit key.
- Two consecutive full test runs pass before a milestone candidate is accepted.
- Final milestone notes include start/end hashes, failing-at-start and passing-at-end assertions,
  alternatives, interface changes, compatibility notes, limitations and unrelated-change disclosure.
- Adjacent milestone ranges share one boundary commit.

## Open release work

- Resolve automatic backup rotation and review remaining operational documentation.
- Recheck README instructions against the selected starting commit.
- Run two clean-export acceptance passes from the same directory before final milestone selection.
