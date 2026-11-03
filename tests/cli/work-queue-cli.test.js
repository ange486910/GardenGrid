import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI prints the garden work queue as JSON', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-work-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const app = createApplication({ databasePath: database });
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
    const crop = app.service.createCrop({ name: 'Radish', family: 'Brassicaceae', daysToHarvest: 25, frostHardy: true });
    app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01', status: 'active' });
    app.close();
    const result = spawnSync(process.execPath, [
      'src/cli/index.js', 'work-queue', '--database', database,
      '--as-of', '2026-05-20', '--horizon-days', '10'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.total, 1);
    assert.equal(output.tasks[0].type, 'harvest');
  } finally {
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});