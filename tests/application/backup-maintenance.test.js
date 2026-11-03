import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../../src/application/create-application.js';
import { validateGardenBackup } from '../../src/domain/backup.js';
import { runBackupMaintenance } from '../../src/application/backup-maintenance.js';
test('garden maintenance verifies snapshots before retention', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-maintenance-')); const app = createApplication({ databasePath: ':memory:' });
  try {
    const backup = app.service.exportBackup();
    const preview = await runBackupMaintenance({ backup, directory, prefix: 'gardengrid', keep: 2, now: '2026-11-03T08:00:00.000Z', dryRun: true, validate: validateGardenBackup });
    assert.equal(preview.status, 'dry-run'); assert.deepEqual(readdirSync(directory), []);
    const result = await runBackupMaintenance({ backup, directory, prefix: 'gardengrid', keep: 2, validate: validateGardenBackup });
    assert.equal(result.status, 'ok'); assert.equal(readdirSync(directory).some((name) => name.endsWith('.sha256')), true);
  } finally { app.close(); try { rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (error) { if (error.code !== 'EPERM') throw error; } }
});
