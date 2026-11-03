import { ValidationError, requireInteger, requireObject } from './validation.js';

export function createBackupSchedulePlan(input = {}) {
  const payload = requireObject(input, 'backup schedule');
  const cadenceHours = requireInteger(payload.cadenceHours ?? 24, 'cadenceHours', { min: 1, max: 168 });
  const keep = requireInteger(payload.keep ?? 7, 'keep', { min: 1, max: 365 });
  const now = new Date(payload.now ?? new Date().toISOString());
  if (Number.isNaN(now.getTime())) throw new ValidationError('now must be a valid timestamp', { field: 'now' });
  return { cadenceHours, keep, nextRunAt: new Date(now.getTime() + cadenceHours * 36e5).toISOString(), taskName: 'gardengrid-backup' };
}
