import { createHash } from 'node:crypto';
import { ValidationError, requireDate, requireEnum, requireObject, requireString } from './validation.js';

export const SEASON_RESOLUTION_FORMAT = 'gardengrid-season-resolutions';
export const SEASON_RESOLUTION_VERSION = 1;
const ACTIONS = ['replace', 'skip'];

export function validateSeasonResolutions(input, snapshot) {
  const payload = requireObject(input, 'season resolutions');
  if (payload.format !== SEASON_RESOLUTION_FORMAT) throw new ValidationError(`resolution format must be ${SEASON_RESOLUTION_FORMAT}`, { field: 'format' });
  if (payload.version !== SEASON_RESOLUTION_VERSION) throw new ValidationError(`resolution version must be ${SEASON_RESOLUTION_VERSION}`, { field: 'version' });
  if (payload.snapshotChecksum !== snapshot.checksum) throw new ValidationError('resolution snapshot checksum does not match', { field: 'snapshotChecksum' });
  if (!Array.isArray(payload.resolutions) || payload.resolutions.length === 0) throw new ValidationError('resolutions must be a non-empty array', { field: 'resolutions' });
  const sourceIds = new Set(snapshot.plantings.map((row) => row.id));
  const seen = new Set();
  const resolutions = payload.resolutions.map((row, index) => {
    const value = requireObject(row, `resolutions[${index}]`);
    const plantingId = requireString(value.plantingId, `resolutions[${index}].plantingId`, { maxLength: 128 });
    if (!sourceIds.has(plantingId)) throw new ValidationError('resolution references an unknown planting', { field: 'plantingId', plantingId });
    if (seen.has(plantingId)) throw new ValidationError('resolution planting ids must be unique', { field: 'plantingId', plantingId });
    seen.add(plantingId);
    const action = requireEnum(value.action, `resolutions[${index}].action`, ACTIONS);
    if (action === 'skip') return { plantingId, action };
    const plantedOn = requireDate(value.plantedOn, `resolutions[${index}].plantedOn`);
    const expectedHarvestOn = requireDate(value.expectedHarvestOn, `resolutions[${index}].expectedHarvestOn`);
    if (expectedHarvestOn < plantedOn) throw new ValidationError('resolved harvest date precedes planting date', { field: 'expectedHarvestOn', plantingId });
    return {
      plantingId,
      action,
      plotId: requireString(value.plotId, `resolutions[${index}].plotId`, { maxLength: 128 }),
      cropId: requireString(value.cropId, `resolutions[${index}].cropId`, { maxLength: 128 }),
      plantedOn,
      expectedHarvestOn
    };
  });
  return { format: payload.format, version: payload.version, snapshotChecksum: payload.snapshotChecksum, resolutions };
}

export function applySeasonResolutions(snapshot, resolutionFile) {
  const resolution = validateSeasonResolutions(resolutionFile, snapshot);
  const byId = new Map(resolution.resolutions.map((row) => [row.plantingId, row]));
  const plantings = snapshot.plantings.flatMap((row) => {
    const change = byId.get(row.id);
    if (!change) return [row];
    if (change.action === 'skip') return [];
    return [{ ...row, plotId: change.plotId, cropId: change.cropId, plantedOn: change.plantedOn, expectedHarvestOn: change.expectedHarvestOn }];
  });
  return { ...snapshot, plantings };
}

export function seasonImportPreviewToken({ snapshot, resolutionFile = null, errors }) {
  return createHash('sha256').update(JSON.stringify({
    snapshotChecksum: snapshot.checksum,
    resolutions: resolutionFile?.resolutions ?? [],
    errors
  })).digest('hex');
}
