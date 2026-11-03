#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createApplication } from '../application/create-application.js';
import { startServer } from '../api/server.js';
import { runBackupMaintenance } from '../application/backup-maintenance.js';
import { validateGardenBackup } from '../domain/backup.js';

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
    else if (token === '--rounds') options.rounds = argv[++index];
    else if (token === '--file') options.file = argv[++index];
    else if (token === '--resolution-file') options.resolutionFile = argv[++index];
    else if (token === '--preview-token') options.previewToken = argv[++index];
    else if (token === '--out') options.out = argv[++index];
    else if (token === '--format') options.format = argv[++index];
    else if (token === '--harvest') options.harvest = argv[++index];
    else if (token === '--rule') options.rule = argv[++index];
    else if (token === '--crop-a') options.cropA = argv[++index];
    else if (token === '--crop-b') options.cropB = argv[++index];
    else if (token === '--type') options.type = argv[++index];
    else if (token === '--note') options.note = argv[++index];
    else if (token === '--crop-action') options.cropAction = argv[++index];
    else if (token === '--kind') options.kind = argv[++index];
    else if (token === '--ids') options.ids = argv[++index];
    else if (token === '--season') options.season = Number(argv[++index]);
    else if (token === '--dir') options.dir = argv[++index];
    else if (token === '--keep') options.keep = Number(argv[++index]);
    else if (token === '--cadence-hours') options.cadenceHours = Number(argv[++index]);
    else if (token === '--horizon-days') options.horizonDays = Number(argv[++index]);
    else if (token === '--dry-run') options.dryRun = true;
  }
  return { command, options };
}

const help = `GardenGrid CLI

  node src/cli/index.js migrate [--database <path>]
  node src/cli/index.js calendar --from YYYY-MM-DD --to YYYY-MM-DD [--database <path>]
  node src/cli/index.js calendar-export --from YYYY-MM-DD --to YYYY-MM-DD --file <ics> [--plot <id>]
  node src/cli/index.js work-queue --as-of YYYY-MM-DD [--horizon-days <n>] [--plot <id>]
  node src/cli/index.js frost --name <name> --zone <zone> --last-frost YYYY-MM-DD --first-frost YYYY-MM-DD
  node src/cli/index.js window --crop <id> --profile <id> [--database <path>]
  node src/cli/index.js harvest --planting <id> --date YYYY-MM-DD --quantity <n> --unit <unit>
  node src/cli/index.js harvest-update --harvest <id> --date YYYY-MM-DD --quantity <n> --unit <unit>
  node src/cli/index.js harvest-delete --harvest <id>
  node src/cli/index.js harvest-revisions
  node src/cli/index.js backup --file <json> [--database <path>]
  node src/cli/index.js restore --file <json> [--database <path>]
  node src/cli/index.js yield [--plot <id>] [--database <path>]
  node src/cli/index.js season-export --file <path> --format <json|csv> [--database <path>]
  node src/cli/index.js season-resolution-template --file <json> --out <json> [--database <path>]
  node src/cli/index.js season-import --file <json> [--dry-run] [--resolution-file <json>] [--preview-token <token>] [--database <path>]
  node src/cli/index.js companions [--database <path>]
  node src/cli/index.js companion-rules [--database <path>]
  node src/cli/index.js companion-rule-add --crop-a <name> --crop-b <name> --type <companion|antagonist> --note <text>
  node src/cli/index.js companion-rule-delete --rule <id>
  node src/cli/index.js rotation-record --plot <id> --crop <id> --date YYYY-MM-DD [--ended YYYY-MM-DD]
  node src/cli/index.js rest-add --plot <id> --kind <fallow|cover_crop> --date YYYY-MM-DD --ended YYYY-MM-DD [--crop <id>] [--note <text>]
  node src/cli/index.js rest-list [--plot <id>]
  node src/cli/index.js plot-reorder --ids <id1,id2,...>
  node src/cli/index.js backup-auto --dir <path> [--keep <n>] [--dry-run]
  node src/cli/index.js target-add --plot <id> --crop <id> --season <year> --quantity <n> --unit <unit>
  node src/cli/index.js target-report --season <year>
  node src/cli/index.js rotation-report --as-of YYYY-MM-DD [--database <path>]
  node src/cli/index.js crop --name <name> --family <family> --days <n> --frost-hardy <true|false>
  node src/cli/index.js crop-status --crop <id> --crop-action <archive|restore>
  node src/cli/index.js succession --crop <id> --profile <id> --count <n> --interval-days <n>
  node src/cli/index.js succession-create --plot <id> --crop <id> --profile <id> --count <n> --interval-days <n> [--rounds 1,2]
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
    console.log(JSON.stringify({ status: 'ok', events: app.service.calendar(options.from, options.to, options.plot) }, null, 2));
  } finally { app.close(); }
} else if (command === 'calendar-export') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const result = app.service.exportCalendarIcs({ from: options.from, to: options.to, plotId: options.plot });
    writeFileSync(options.file, result.body, 'utf8');
    console.log(JSON.stringify({ status: 'ok', file: options.file, format: 'ics' }, null, 2));
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
} else if (command === 'harvest-update') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', harvest: app.service.correctHarvest(options.harvest, {
      harvestedOn: options.date,
      quantity: options.quantity,
      unit: options.unit
    }) }, null, 2));
  } finally { app.close(); }
} else if (command === 'harvest-delete') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', ...app.service.deleteHarvest(options.harvest) }, null, 2));
  } finally { app.close(); }
} else if (command === 'harvest-revisions') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', revisions: app.service.listHarvestRevisions() }, null, 2));
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
} else if (command === 'season-resolution-template') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const snapshot = JSON.parse(readFileSync(options.file, 'utf8'));
    const template = app.service.seasonResolutionTemplate(snapshot);
    writeFileSync(options.out, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: 'ok', file: options.out, conflictCount: template.conflictCount }, null, 2));
  } finally { app.close(); }
} else if (command === 'season-import') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const snapshot = JSON.parse(readFileSync(options.file, 'utf8'));
    const resolutions = options.resolutionFile
      ? JSON.parse(readFileSync(options.resolutionFile, 'utf8'))
      : undefined;
    const result = app.service.importSeason(snapshot, {
      dryRun: options.dryRun === true,
      resolutions,
      previewToken: options.previewToken
    });
    console.log(JSON.stringify({ status: 'ok', ...result }, null, 2));
  } finally { app.close(); }
} else if (command === 'backup-auto') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const result = await runBackupMaintenance({
      backup: app.service.exportBackup(), directory: options.dir, prefix: 'gardengrid',
      keep: options.keep ?? 7, cadenceHours: options.cadenceHours ?? 24,
      now: new Date().toISOString(), dryRun: options.dryRun === true, validate: validateGardenBackup
    });
    console.log(JSON.stringify({ status: 'ok', ...result }, null, 2));
  } finally { app.close(); }
} else if (command === 'backup') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const backup = app.service.exportBackup();
    writeFileSync(options.file, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: 'ok', file: options.file, checksum: backup.checksum }, null, 2));
  } finally { app.close(); }
} else if (command === 'restore') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const backup = JSON.parse(readFileSync(options.file, 'utf8'));
    console.log(JSON.stringify({ status: 'ok', ...app.service.restoreBackup(backup) }, null, 2));
  } finally { app.close(); }
} else if (command === 'companions') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', ...app.service.companionReport() }, null, 2));
  } finally { app.close(); }
} else if (command === 'companion-rules') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', rules: app.service.listCompanionRules() }, null, 2));
  } finally { app.close(); }
} else if (command === 'companion-rule-add') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const rule = app.service.createCompanionRule({ pair: [options.cropA, options.cropB], type: options.type, note: options.note });
    console.log(JSON.stringify({ status: 'ok', rule }, null, 2));
  } finally { app.close(); }
} else if (command === 'companion-rule-delete') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', ...app.service.deleteCompanionRule(options.rule) }, null, 2));
  } finally { app.close(); }
} else if (command === 'target-add') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const target = app.service.setHarvestTarget({
      plotId: options.plot, cropId: options.crop, season: options.season,
      targetQuantity: options.quantity, unit: options.unit, note: options.note
    });
    console.log(JSON.stringify({ status: 'ok', target }, null, 2));
  } finally { app.close(); }
} else if (command === 'target-report') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', report: app.service.harvestTargetReport(options.season) }, null, 2));
  } finally { app.close(); }
} else if (command === 'plot-reorder') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const plotIds = options.ids?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
    console.log(JSON.stringify({ status: 'ok', plots: app.service.reorderPlots(plotIds) }, null, 2));
  } finally { app.close(); }
} else if (command === 'rest-add') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const period = app.service.recordRestPeriod({
      plotId: options.plot,
      kind: options.kind,
      cropId: options.crop,
      startedOn: options.date,
      endedOn: options.ended,
      note: options.note
    });
    console.log(JSON.stringify({ status: 'ok', period }, null, 2));
  } finally { app.close(); }
} else if (command === 'rest-list') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', periods: app.service.listRestPeriods(options.plot) }, null, 2));
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
} else if (command === 'crop-status') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const crop = options.cropAction === 'archive' ? app.service.archiveCrop(options.crop) : app.service.restoreCrop(options.crop);
    console.log(JSON.stringify({ status: 'ok', crop }, null, 2));
  } finally { app.close(); }
} else if (command === 'succession') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const plan = app.service.successionPlan(options.crop, options.profile, options.count, options.intervalDays);
    console.log(JSON.stringify({ status: 'ok', plan }, null, 2));
  } finally { app.close(); }
} else if (command === 'succession-create') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const selectedRounds = options.rounds == null
      ? undefined
      : options.rounds.split(',').map((value) => Number(value.trim()));
    const result = app.service.createSuccession({
      plotId: options.plot,
      cropId: options.crop,
      profileId: options.profile,
      count: options.count,
      intervalDays: options.intervalDays,
      selectedRounds
    });
    console.log(JSON.stringify({ status: 'ok', ...result }, null, 2));
  } finally { app.close(); }
} else if (command === 'work-queue') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({
      status: 'ok',
      ...app.service.workQueue({
        asOf: options.asOf,
        horizonDays: options.horizonDays ?? 14,
        plotId: options.plot
      })
    }, null, 2));
  } finally { app.close(); }
} else if (command === 'serve') {
  const app = createApplication({ databasePath: options.databasePath });
  const server = await startServer(app.service, { port: options.port ?? 4312 });
  console.log(JSON.stringify({ status: 'ok', url: `http://127.0.0.1:${server.address().port}` }));
} else {
  console.log(help);
}