import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI corrects a harvest and restores a complete garden backup', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-backup-cli-'));
  const sourceDatabase = join(directory, 'source.sqlite');
  const targetDatabase = join(directory, 'target.sqlite');
  const backupPath = join(directory, 'garden.json');
  let harvestId;
  try {
    const app = createApplication({ databasePath: sourceDatabase });
    const plot = app.service.createPlot({ name: 'Bed', areaSqm: 4 });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    harvestId = app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-06-15', quantity: 1, unit: 'kg' }).id;
    app.close();

    const corrected = spawnSync(process.execPath, [
      'src/cli/index.js', 'harvest-update', '--database', sourceDatabase,
      '--harvest', harvestId, '--date', '2026-06-16', '--quantity', '2.5', '--unit', 'kg'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(corrected.status, 0, corrected.stderr);
    assert.equal(JSON.parse(corrected.stdout).harvest.quantity, 2.5);

    const backup = spawnSync(process.execPath, [
      'src/cli/index.js', 'backup', '--database', sourceDatabase, '--file', backupPath
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(backup.status, 0, backup.stderr);
    assert.equal(JSON.parse(readFileSync(backupPath, 'utf8')).counts.harvests, 1);

    const restored = spawnSync(process.execPath, [
      'src/cli/index.js', 'restore', '--database', targetDatabase, '--file', backupPath
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(restored.status, 0, restored.stderr);
    const target = createApplication({ databasePath: targetDatabase });
    assert.equal(target.service.listHarvests()[0].quantity, 2.5);
    target.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
