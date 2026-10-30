import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI records rotation history and prints the three-year report', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-cli-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const app = createApplication({ databasePath: database });
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    app.close();

    const record = spawnSync(process.execPath, [
      'src/cli/index.js', 'rotation-record', '--database', database,
      '--plot', plot.id, '--crop', crop.id, '--date', '2024-05-01', '--ended', '2024-08-01'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(record.status, 0, record.stderr);
    assert.equal(JSON.parse(record.stdout).event.family, 'Solanaceae');

    const report = spawnSync(process.execPath, [
      'src/cli/index.js', 'rotation-report', '--database', database, '--as-of', '2026-10-30'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(report.status, 0, report.stderr);
    assert.deepEqual(JSON.parse(report.stdout).report.plots[0].blockedFamilies, ['Solanaceae']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
