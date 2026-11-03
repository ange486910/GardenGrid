#!/usr/bin/env node
import { createApplication } from '../src/application/create-application.js';
import { runBackupMaintenance } from '../src/application/backup-maintenance.js';
import { validateGardenBackup } from '../src/domain/backup.js';
const args = process.argv.slice(2); const value = (name, fallback) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const app = createApplication({ databasePath: value('--database', 'data/gardengrid.sqlite') });
try {
  const result = await runBackupMaintenance({ backup: app.service.exportBackup(), directory: value('--dir', 'data/backups'), prefix: 'gardengrid', keep: Number(value('--keep', '7')), cadenceHours: Number(value('--cadence-hours', '24')), now: new Date().toISOString(), dryRun: args.includes('--dry-run'), validate: validateGardenBackup });
  console.log(JSON.stringify({ status: 'ok', ...result }, null, 2));
} finally { app.close(); }
