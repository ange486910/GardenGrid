import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupSchedulePlan } from '../../src/domain/backup-schedule.js';
test('garden backup plan calculates next run and retention', () => {
  const plan = createBackupSchedulePlan({ now: '2026-11-03T08:00:00.000Z', cadenceHours: 12, keep: 5 });
  assert.equal(plan.nextRunAt, '2026-11-03T20:00:00.000Z');
  assert.equal(plan.taskName, 'gardengrid-backup');
  assert.throws(() => createBackupSchedulePlan({ keep: 0 }), /keep/);
});
