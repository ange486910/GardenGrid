import { createHash } from 'node:crypto';
import { ValidationError } from './validation.js';

export const GARDEN_BACKUP_FORMAT = 'gardengrid-backup';
export const GARDEN_BACKUP_VERSION = 1;
const COLLECTIONS = ['plots', 'crops', 'frostProfiles', 'plantings', 'harvests', 'rotationEvents', 'restPeriods', 'harvestTargets'];

function checksum(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function ids(rows, name) {
  const result = new Set();
  for (const row of rows) {
    if (!row?.id) throw new ValidationError(`${name} rows need ids`, { field: name });
    if (result.has(row.id)) throw new ValidationError(`${name} ids must be unique`, { field: name, id: row.id });
    result.add(row.id);
  }
  return result;
}

export function buildGardenBackup({ data, generatedAt }) {
  if (!data || typeof data !== 'object') throw new ValidationError('backup data is required', { field: 'data' });
  if (typeof generatedAt !== 'string' || Number.isNaN(Date.parse(generatedAt))) throw new ValidationError('generatedAt must be an ISO timestamp', { field: 'generatedAt' });
  for (const name of COLLECTIONS) if (!Array.isArray(data[name])) throw new ValidationError(`${name} must be an array`, { field: name });
  const normalized = structuredClone(data);
  return {
    format: GARDEN_BACKUP_FORMAT,
    version: GARDEN_BACKUP_VERSION,
    generatedAt: new Date(generatedAt).toISOString(),
    counts: Object.fromEntries(COLLECTIONS.map((name) => [name, normalized[name].length])),
    checksum: checksum(normalized),
    data: normalized
  };
}

export function validateGardenBackup(input) {
  if (!input || input.format !== GARDEN_BACKUP_FORMAT) throw new ValidationError('unsupported garden backup format', { field: 'format' });
  if (input.version !== GARDEN_BACKUP_VERSION) throw new ValidationError('unsupported garden backup version', { field: 'version' });
  if (!input.data) throw new ValidationError('backup data is required', { field: 'data' });
  for (const name of COLLECTIONS) if (!Array.isArray(input.data[name])) throw new ValidationError(`${name} must be an array`, { field: name });
  if (checksum(input.data) !== input.checksum) throw new ValidationError('backup checksum does not match', { field: 'checksum' });
  const counts = Object.fromEntries(COLLECTIONS.map((name) => [name, input.data[name].length]));
  if (JSON.stringify(counts) !== JSON.stringify(input.counts)) throw new ValidationError('backup counts do not match', { field: 'counts' });
  const plotIds = ids(input.data.plots, 'plots');
  const cropIds = ids(input.data.crops, 'crops');
  const plantingIds = ids(input.data.plantings, 'plantings');
  ids(input.data.harvests, 'harvests');
  ids(input.data.frostProfiles, 'frostProfiles');
  ids(input.data.rotationEvents, 'rotationEvents');
  ids(input.data.restPeriods, 'restPeriods');
  ids(input.data.harvestTargets, 'harvestTargets');
  for (const planting of input.data.plantings) {
    if (!plotIds.has(planting.plotId) || !cropIds.has(planting.cropId)) throw new ValidationError('planting references an unknown plot or crop', { field: 'plantingId', id: planting.id });
  }
  for (const harvest of input.data.harvests) {
    if (!plantingIds.has(harvest.plantingId)) throw new ValidationError('harvest references an unknown planting', { field: 'plantingId', id: harvest.id });
  }
  for (const event of input.data.rotationEvents) {
    if (!plotIds.has(event.plotId) || !cropIds.has(event.cropId)) throw new ValidationError('rotation event references an unknown plot or crop', { field: 'rotationEventId', id: event.id });
  }
  for (const period of input.data.restPeriods) {
    if (!plotIds.has(period.plotId)) throw new ValidationError('rest period references an unknown plot', { field: 'plotId', id: period.id });
    if (period.cropId && !cropIds.has(period.cropId)) throw new ValidationError('rest period references an unknown crop', { field: 'cropId', id: period.id });
  }
  for (const target of input.data.harvestTargets) {
    if (!plotIds.has(target.plotId) || !cropIds.has(target.cropId)) {
      throw new ValidationError('harvest target references an unknown plot or crop', { field: 'harvestTargetId', id: target.id });
    }
  }
  return input;
}
