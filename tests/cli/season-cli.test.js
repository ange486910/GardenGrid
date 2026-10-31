import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI filters yields and writes season exports', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-season-cli-'));
  const database = join(directory, 'garden.sqlite');
  const jsonPath = join(directory, 'season.json');
  const csvPath = join(directory, 'season.csv');
  try {
    const app = createApplication({ databasePath: database });
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 2.5, unit: 'kg' });
    app.close();

    const report = spawnSync(process.execPath, [
      'src/cli/index.js', 'yield', '--database', database, '--plot', plot.id
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(report.status, 0, report.stderr);
    assert.equal(JSON.parse(report.stdout).yield.rows[0].totalQuantity, 2.5);

    const jsonExport = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-export', '--database', database,
      '--file', jsonPath, '--format', 'json'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(jsonExport.status, 0, jsonExport.stderr);
    assert.equal(JSON.parse(readFileSync(jsonPath, 'utf8')).counts.plantings, 1);

    const csvExport = spawnSync(process.execPath, [
      'src/cli/index.js', 'season-export', '--database', database,
      '--file', csvPath, '--format', 'csv'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(csvExport.status, 0, csvExport.stderr);
    assert.match(readFileSync(csvPath, 'utf8'), /Tomato/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
