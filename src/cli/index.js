#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createApplication } from '../application/create-application.js';
import { startServer } from '../api/server.js';

function parse(argv) {
  const command = argv[2] ?? 'help';
  const options = { databasePath: 'data/gardengrid.sqlite' };
  for (let index = 3; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--database') options.databasePath = argv[++index];
    else if (token === '--from') options.from = argv[++index];
    else if (token === '--to') options.to = argv[++index];
    else if (token === '--port') options.port = Number(argv[++index]);
    else if (token === '--name') options.name = argv[++index];
    else if (token === '--zone') options.zone = argv[++index];
    else if (token === '--last-frost') options.lastFrost = argv[++index];
    else if (token === '--first-frost') options.firstFrost = argv[++index];
    else if (token === '--crop') options.crop = argv[++index];
    else if (token === '--profile') options.profile = argv[++index];
    else if (token === '--planting') options.planting = argv[++index];
    else if (token === '--date') options.date = argv[++index];
    else if (token === '--quantity') options.quantity = Number(argv[++index]);
    else if (token === '--unit') options.unit = argv[++index];
    else if (token === '--plot') options.plot = argv[++index];
    else if (token === '--ended') options.ended = argv[++index];
    else if (token === '--as-of') options.asOf = argv[++index];
    else if (token === '--family') options.family = argv[++index];
    else if (token === '--days') options.days = Number(argv[++index]);
    else if (token === '--frost-hardy') options.frostHardy = argv[++index] !== 'false';
    else if (token === '--earliest-weeks') options.earliestWeeks = Number(argv[++index]);
    else if (token === '--latest-weeks') options.latestWeeks = Number(argv[++index]);
    else if (token === '--count') options.count = Number(argv[++index]);
    else if (token === '--interval-days') options.intervalDays = Number(argv[++index]);
    else if (token === '--file') options.file = argv[++index];
    else if (token === '--format') options.format = argv[++index];
    else if (token === '--dry-run') options.dryRun = true;
  }
  return { command, options };
}

const help = `GardenGrid CLI

  node src/cli/index.js migrate [--database <path>]
  node src/cli/index.js calendar --from YYYY-MM-DD --to YYYY-MM-DD [--database <path>]
  node src/cli/index.js frost --name <name> --zone <zone> --last-frost YYYY-MM-DD --first-frost YYYY-MM-DD
  node src/cli/index.js window --crop <id> --profile <id> [--database <path>]
  node src/cli/index.js harvest --planting <id> --date YYYY-MM-DD --quantity <n> --unit <unit>
  node src/cli/index.js yield [--plot <id>] [--database <path>]
  node src/cli/index.js season-export --file <path> --format <json|csv> [--database <path>]
  node src/cli/index.js season-import --file <json> [--dry-run] [--database <path>]
  node src/cli/index.js companions [--database <path>]
  node src/cli/index.js rotation-record --plot <id> --crop <id> --date YYYY-MM-DD [--ended YYYY-MM-DD]
  node src/cli/index.js rotation-report --as-of YYYY-MM-DD [--database <path>]
  node src/cli/index.js crop --name <name> --family <family> --days <n> --frost-hardy <true|false>
  node src/cli/index.js succession --crop <id> --profile <id> --count <n> --interval-days <n>
  node src/cli/index.js serve [--port <port>] [--database <path>]
`;

const { command, options } = parse(process.argv);

if (command === 'migrate') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const tables = app.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all().map((row) => row.name);
    console.log(JSON.stringify({ status: 'ok', database: options.databasePath, tables }, null, 2));
  } finally { app.close(); }
} else if (command === 'calendar') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', events: app.service.calendar(options.from, options.to) }, null, 2));
  } finally { app.close(); }
} else if (command === 'frost') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const profile = app.service.createFrostProfile({ name: options.name, zone: options.zone, lastFrostDate: options.lastFrost, firstFrostDate: options.firstFrost });
    console.log(JSON.stringify({ status: 'ok', profile }, null, 2));
  } finally { app.close(); }
} else if (command === 'window') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', window: app.service.window(options.crop, options.profile) }, null, 2));
  } finally { app.close(); }
} else if (command === 'harvest') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const harvest = app.service.recordHarvest({
      plantingId: options.planting,
      harvestedOn: options.date,
      quantity: options.quantity,
      unit: options.unit
    });
    console.log(JSON.stringify({ status: 'ok', harvest }, null, 2));
  } finally { app.close(); }
} else if (command === 'yield') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const report = options.plot ? app.service.yieldByPlot(options.plot) : app.service.yieldReport();
    console.log(JSON.stringify({ status: 'ok', yield: report }, null, 2));
  } finally { app.close(); }
} else if (command === 'season-export') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const result = app.service.exportSeason(options.format ?? 'json');
    const content = result.format === 'csv'
      ? result.body
      : `${JSON.stringify(result.body, null, 2)}\n`;
    writeFileSync(options.file, content, 'utf8');
    console.log(JSON.stringify({
      status: 'ok', file: options.file, format: result.format, checksum: result.checksum
    }, null, 2));
  } finally { app.close(); }
} else if (command === 'season-import') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const snapshot = JSON.parse(readFileSync(options.file, 'utf8'));
    const result = app.service.importSeason(snapshot, { dryRun: options.dryRun === true });
    console.log(JSON.stringify({ status: 'ok', ...result }, null, 2));
  } finally { app.close(); }
} else if (command === 'companions') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', ...app.service.companionReport() }, null, 2));
  } finally { app.close(); }
} else if (command === 'rotation-record') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const event = app.service.recordRotation({
      plotId: options.plot,
      cropId: options.crop,
      plantedOn: options.date,
      endedOn: options.ended
    });
    console.log(JSON.stringify({ status: 'ok', event }, null, 2));
  } finally { app.close(); }
} else if (command === 'rotation-report') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', report: app.service.rotationReport(options.asOf) }, null, 2));
  } finally { app.close(); }
} else if (command === 'crop') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const crop = app.service.createCrop({
      name: options.name,
      family: options.family,
      daysToHarvest: options.days,
      frostHardy: options.frostHardy,
      earliestSowWeeks: Number.isNaN(options.earliestWeeks) ? null : options.earliestWeeks,
      latestSowWeeks: Number.isNaN(options.latestWeeks) ? null : options.latestWeeks
    });
    console.log(JSON.stringify({ status: 'ok', crop }, null, 2));
  } finally { app.close(); }
} else if (command === 'succession') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const plan = app.service.successionPlan(options.crop, options.profile, options.count, options.intervalDays);
    console.log(JSON.stringify({ status: 'ok', plan }, null, 2));
  } finally { app.close(); }
} else if (command === 'serve') {
  const app = createApplication({ databasePath: options.databasePath });
  const server = await startServer(app.service, { port: options.port ?? 4312 });
  console.log(JSON.stringify({ status: 'ok', url: `http://127.0.0.1:${server.address().port}` }));
} else {
  console.log(help);
}
