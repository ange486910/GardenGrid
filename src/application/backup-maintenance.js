import { createBackupSchedulePlan } from '../domain/backup-schedule.js';
import { pruneBackupSnapshots, verifyBackupSnapshot, writeBackupSnapshot } from './backup-files.js';
export async function runBackupMaintenance({ backup, directory, prefix, keep, cadenceHours, now, dryRun = false, validate }) {
  const plan = createBackupSchedulePlan({ cadenceHours, keep, now });
  if (dryRun) return { status: 'dry-run', plan, directory };
  const created = await writeBackupSnapshot({ directory, prefix, backup, validate });
  await verifyBackupSnapshot(created.path, validate);
  return { status: 'ok', plan, created, removed: await pruneBackupSnapshots({ directory, prefix, keep }) };
}
