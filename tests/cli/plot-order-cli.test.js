import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApplication } from '../../src/application/create-application.js';

test('CLI persists a complete bed ordering', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-order-cli-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const app = createApplication({ databasePath: database });
    const a = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
    const b = app.service.createPlot({ name: 'Bed B', areaSqm: 4 });
    app.close();
    const result = spawnSync(process.execPath, [
      'src/cli/index.js', 'plot-reorder', '--database', database, '--ids', `${b.id},${a.id}`
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).plots.map((row) => row.id), [b.id, a.id]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
