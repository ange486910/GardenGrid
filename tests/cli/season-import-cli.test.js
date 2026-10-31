import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

function seedSource(database) {
  const app = createApplication({ databasePath: database });
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
  app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 2, unit: 'kg' });
  app.close();
}

function seedTarget(database) {
  const app = createApplication({ databasePath: database });
  app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  app.close();
}

test('CLI exports a season and imports it through preview and apply', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-import-cli-'));
  const sourceDatabase = join(directory, 'source.sqlite');
  const targetDatabase = join(directory, 'target.sqlite');
  const snapshotPath = join(directory, 'season.json');
  try {
    seedSource(sourceDatabase);
    seedTarget(targetDatabase);

    const exported = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-export', '--database', sourceDatabase,
      '--file', snapshotPath, '--format', 'json'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(exported.status, 0, exported.stderr);

    const preview = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-import', '--database', targetDatabase,
      '--file', snapshotPath, '--dry-run'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).ready, 1);

    const imported = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-import', '--database', targetDatabase, '--file', snapshotPath
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(JSON.parse(imported.stdout).imported.plantings, 1);

    const target = createApplication({ databasePath: targetDatabase });
    assert.equal(target.service.listPlantings().length, 1);
    assert.equal(target.service.listHarvests().length, 1);
    target.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
