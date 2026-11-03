import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI records and reports a harvest target', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-target-cli-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const app = createApplication({ databasePath: database });
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    app.close();
    const added = spawnSync(process.execPath, [
      'src/cli/index.js', 'target-add', '--database', database, '--plot', plot.id,
      '--crop', crop.id, '--season', '2026', '--quantity', '10', '--unit', 'kg'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(added.status, 0, added.stderr);
    const report = spawnSync(process.execPath, [
      'src/cli/index.js', 'target-report', '--database', database, '--season', '2026'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(report.status, 0, report.stderr);
    assert.equal(JSON.parse(report.stdout).report.rows[0].completionPercent, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
