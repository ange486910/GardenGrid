# Process Notes - GardenGrid

This document records the reasoning behind decisions that are not obvious from the final code.
It separates the problem, alternatives, chosen design, consequences and verification evidence.

## 1. Keep bed occupancy separate from crop rotation history

**Problem.** A bed can be intentionally empty or growing a cover crop. Treating those periods as
ordinary plantings would either block unrelated crops or create false rotation conflicts.

**Alternatives.**

1. Insert fake crop plantings. This pollutes harvest and rotation reports.
2. Allow overlapping plantings and rely on warnings. This creates impossible schedules.
3. Store explicit rest periods and check them when either a rest or planting is created.

**Decision.** Use option 3. Rest periods have a plot, date range, kind and optional cover crop.
They reserve bed dates but do not create rotation family history.

**Consequences.** A rest period and a planting cannot overlap. Rest days appear in the rotation
report as operational information, not as blocked crop families.

**Verification.** Service tests cover rest/rest and rest/planting conflicts; backup tests restore the
periods; rotation tests assert the rest-day summary.

## 2. Resolve import conflicts through a checksum-bound review file

**Problem.** A preview that merely lists conflicts leaves the user with no safe way to change the
source and continue.

**Alternatives.**

1. Automatically shift conflicting dates. This changes an agronomic plan without user approval.
2. Mutate the imported package in the browser. This separates the applied payload from its checksum.
3. Keep the package immutable, apply a separate replacement/skip file, and require a preview token
   before the write.

**Decision.** Use option 3. The resolution file is bound to the package checksum. Replacements can
change plot, crop and dates; skips remove selected plantings. The preview token covers the snapshot,
resolution and current conflicts.

**Consequences.** Any bed change after preview invalidates the token. Users must rerun the preview.
A conflict template can generate reviewed skip entries, but applying it still requires a fresh token.

**Verification.** Tests cover successful replacement, dependency skips, stale preview rejection,
atomic rollback, API/CLI application and template generation.

## 3. Store explicit bed order instead of rewriting bed names

**Problem.** Relying on alphabetic names prevents users from matching the physical walking order of
their garden and encourages name prefixes such as "01 - Tomato bed".

**Alternatives.**

1. Sort client-side only. The order disappears after refresh or on another device.
2. Allow arbitrary duplicate order values. The final order becomes nondeterministic.
3. Store an integer order per bed and require the complete set of bed ids when reordering.

**Decision.** Use option 3. Reordering assigns contiguous values from one and rejects missing,
unknown or duplicate ids. The browser uses Alt+Arrow keys; the CLI and API use the same validation.

**Consequences.** Every successful reorder rewrites all current beds, which is cheap at garden scale.
New beds initially have order zero and sort by name until the next reorder.

**Verification.** Domain tests reject incomplete orderings, repository tests assert deterministic
sorting, API and CLI tests assert persisted order, and the browser test checks keyboard movement.

## Evidence commands

```powershell
node scripts/baseline-check.mjs
node scripts/verify.mjs
node scripts/audit.mjs
```

## Known limitations

- Drag-and-drop is intentionally absent; keyboard movement is the primary accessible interaction.
- Rest periods cannot yet be split when a planting date is manually edited.
- The season repair template defaults to skip records; replacements remain intentionally explicit.
