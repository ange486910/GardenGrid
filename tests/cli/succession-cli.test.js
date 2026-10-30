import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI creates an offset crop and prints a succession plan', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-succession-cli-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const app = createApplication({ databasePath: database });
    const profile = app.service.createFrostProfile({
      name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01'
    });
    app.close();

    const created = spawnSync(process.execPath, [
      'src/cli/index.js', 'crop', '--database', database, '--name', 'Cilantro', '--family', 'Apiaceae',
      '--days', '50', '--frost-hardy', 'true', '--earliest-weeks', '-2', '--latest-weeks', '2'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(created.status, 0, created.stderr);
    const crop = JSON.parse(created.stdout).crop;
    assert.equal(crop.earliestSowWeeks, -2);

    const planned = spawnSync(process.execPath, [
      'src/cli/index.js', 'succession', '--database', database,
      '--crop', crop.id, '--profile', profile.id, '--count', '3', '--interval-days', '14'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(planned.status, 0, planned.stderr);
    assert.deepEqual(JSON.parse(planned.stdout).plan.rounds.map((round) => round.sowOn), ['2026-05-01', '2026-05-15', '2026-05-29']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
