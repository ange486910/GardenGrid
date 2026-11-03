import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('garden CLI runs automatic backup maintenance', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-auto-cli-')); const snapshots = join(directory, 'backups');
  try {
    const preview = spawnSync(process.execPath, ['src/cli/index.js', 'backup-auto', '--database', join(directory, 'g.sqlite'), '--dir', snapshots, '--dry-run'], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr); assert.equal(JSON.parse(preview.stdout).status, 'dry-run');
    const run = spawnSync(process.execPath, ['src/cli/index.js', 'backup-auto', '--database', join(directory, 'g.sqlite'), '--dir', snapshots, '--keep', '2'], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr); assert.equal(readdirSync(snapshots).some((name) => name.endsWith('.sha256')), true);
  } finally { rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
});
