# GardenGrid 7-Day Plan

| Day | Deliverable | Acceptance |
| --- | --- | --- |
| D1 | Plots, crops, plantings, rotation check, calendar, API, CLI | `node --test` green; calendar covers plant and harvest events |
| D2 | Frost-date profiles and sowing windows | window tests per frost profile |
| D3 | Harvest logging and yield records | yield summary tests |
| D4 | Crop companions and conflict warnings | companion rule tests |
| D5 | Bed rotation history and 3-year report | rotation report tests |
| D6 | Browser workspace (plots/crops/calendar) | DOM interaction tests |
| D7 | Docker, CI, acceptance audit, dual-remote release | `verify` green + release tag |

Each day lands at least five focused commits; no generated or duplicated code.
