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

## Run

```powershell
node src/cli/index.js migrate
node src/cli/index.js calendar --from 2026-10-01 --to 2026-12-31
node src/cli/index.js frost --name "Zone 5" --zone 5a --last-frost 2026-05-15 --first-frost 2026-10-01
node src/cli/index.js harvest --planting <id> --date 2026-10-20 --quantity 2.5 --unit kg
node src/cli/index.js companions
node src/cli/index.js yield
node src/cli/index.js rotation-record --plot <id> --crop <id> --date 2024-05-01 --ended 2024-08-01
node src/cli/index.js rotation-report --as-of 2026-10-30
node src/cli/index.js crop --name Cilantro --family Apiaceae --days 50 --frost-hardy true --earliest-weeks -2 --latest-weeks 2
node src/cli/index.js succession --crop <id> --profile <id> --count 3 --interval-days 14
node src/cli/index.js yield --plot <plot-id>
node src/cli/index.js season-export --file data/season.json --format json
node src/cli/index.js serve
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
- `GET|POST /api/v1/rotation-events`
- `GET /api/v1/rotation-report?asOf=YYYY-MM-DD`
- `GET /api/v1/frost-profiles/:id/succession/:cropId?count=4&intervalDays=14`
- `GET /api/v1/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`

## License

MIT
