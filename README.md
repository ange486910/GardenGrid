# GardenGrid

GardenGrid is an offline-first garden planner: plots, crops, plantings and a planting/harvest
calendar. It runs on Node.js 24 with no third-party runtime dependencies and uses SQLite.

## Current scope

- Plot, crop and planting domain rules, including a three-year rotation check.
- SQLite migration and repositories.
- HTTP API with a planting/harvest calendar.
- CLI for migrate, calendar and serve.
- Frost-aware sowing windows, harvest yields and companion analysis.
- Rotation history snapshots with a three-year per-plot report.
- Crop-specific sowing offsets and succession-round plans.
- Plot-level yield projections and checksummed season-plan exports.
- Checksummed garden backups, transaction-safe restore and harvest correction history.

## Run

```powershell
node src/cli/index.js migrate
node src/cli/index.js calendar --from 2026-10-01 --to 2026-12-31
node src/cli/index.js frost --name "Zone 5" --zone 5a --last-frost 2026-05-15 --first-frost 2026-10-01
node src/cli/index.js harvest --planting <id> --date 2026-10-20 --quantity 2.5 --unit kg
node src/cli/index.js harvest-update --harvest <id> --date 2026-10-21 --quantity 2.8 --unit kg
node src/cli/index.js harvest-revisions
node src/cli/index.js companions
node src/cli/index.js yield
node src/cli/index.js rotation-record --plot <id> --crop <id> --date 2024-05-01 --ended 2024-08-01
node src/cli/index.js rotation-report --as-of 2026-10-30
node src/cli/index.js crop --name Cilantro --family Apiaceae --days 50 --frost-hardy true --earliest-weeks -2 --latest-weeks 2
node src/cli/index.js succession --crop <id> --profile <id> --count 3 --interval-days 14
node src/cli/index.js yield --plot <plot-id>
node src/cli/index.js season-export --file data/season.json --format json
node src/cli/index.js season-import --file data/season.json --dry-run
node src/cli/index.js season-import --file data/season.json
node src/cli/index.js backup --file data/garden-backup.json
node src/cli/index.js restore --file data/garden-backup.json --database data/restored.sqlite
node src/cli/index.js serve
# open http://127.0.0.1:4312/ for the bed board
```

## API

- `GET|POST /api/v1/plots`
- `GET|POST /api/v1/crops`
- `GET|POST /api/v1/plantings`
- `GET|POST /api/v1/frost-profiles`
- `GET /api/v1/frost-profiles/:id/windows/:cropId`
- `GET|POST /api/v1/harvests`
- `GET /api/v1/companions`
- `GET /api/v1/yield`
- `GET /api/v1/yield?plotId=<id>`
- `GET /api/v1/exports/season?format=json|csv`
- `POST /api/v1/imports/season` with a season snapshot and optional `dryRun`
- `GET|POST /api/v1/rotation-events`
- `GET /api/v1/rotation-report?asOf=YYYY-MM-DD`
- `GET /api/v1/frost-profiles/:id/succession/:cropId?count=4&intervalDays=14`
- `GET /api/v1/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PATCH|DELETE /api/v1/harvests/:id`
- `GET /api/v1/harvest-revisions`
- `GET /api/v1/backup`
- `POST /api/v1/restore`

## Browser workspace

The served bed board groups active and planned crops by plot, shows harvest dates and yield totals,
and highlights companion findings. Planting uses the same API contract as the CLI. Static files
carry ETags, and the page includes live status text, keyboard focus styling and offline messaging.

Planting and harvest forms reject invalid quantities, block duplicate submissions and re-enable
controls after API conflicts. Beds use roving arrow-key focus. Edge headless tests cover planting,
rotation conflict recovery, harvest capture, keyboard movement and repeated submissions.

Harvest edits and deletes retain before/after revision records. Full garden backups preserve plots,
crops, planting windows, harvests, frost profiles and rotation snapshots; restore rejects non-empty
databases and rolls back if foreign keys or row counts do not match.

## License

MIT
