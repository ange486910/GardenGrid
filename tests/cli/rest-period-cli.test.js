import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI records and filters fallow and cover-crop periods', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-rest-cli-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const app = createApplication({ databasePath: database });
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const clover = app.service.createCrop({ name: 'Clover', family: 'Fabaceae', daysToHarvest: 60, frostHardy: true });
    app.close();

    const fallow = spawnSync(process.execPath, [
      'src/cli/index.js', 'rest-add', '--database', database, '--plot', plot.id,
      '--kind', 'fallow', '--date', '2026-06-01', '--ended', '2026-07-01', '--note', 'summer rest'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(fallow.status, 0, fallow.stderr);
    assert.equal(JSON.parse(fallow.stdout).period.kind, 'fallow');

    const cover = spawnSync(process.execPath, [
      'src/cli/index.js', 'rest-add', '--database', database, '--plot', plot.id,
      '--kind', 'cover_crop', '--crop', clover.id, '--date', '2026-08-01', '--ended', '2026-09-01'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(cover.status, 0, cover.stderr);

    const listed = spawnSync(process.execPath, [
      'src/cli/index.js', 'rest-list', '--database', database, '--plot', plot.id
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(listed.status, 0, listed.stderr);
    assert.deepEqual(JSON.parse(listed.stdout).periods.map((row) => row.kind), ['fallow', 'cover_crop']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
