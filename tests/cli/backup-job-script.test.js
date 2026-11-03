import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('garden standalone backup job supports dry-run', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-job-'));
  try {
    const result = spawnSync(process.execPath, ['scripts/backup-job.mjs', '--database', join(directory, 'g.sqlite'), '--dir', join(directory, 'backups'), '--dry-run'], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).status, 'dry-run'); assert.equal(JSON.parse(result.stdout).plan.keep, 7);
  } finally { rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
});
