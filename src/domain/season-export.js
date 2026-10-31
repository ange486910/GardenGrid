import { createHash } from 'node:crypto';
import { ValidationError } from './validation.js';

export const SEASON_EXPORT_FORMAT = 'gardengrid-season';
export const SEASON_EXPORT_VERSION = 1;

export function seasonCsvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function requireTimestamp(value) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new ValidationError('generatedAt must be an ISO timestamp', { field: 'generatedAt' });
  }
  return new Date(value).toISOString();
}

export function buildSeasonExport({ plots, crops, plantings, harvests, rotationEvents, generatedAt }) {
  if (![plots, crops, plantings, harvests, rotationEvents].every(Array.isArray)) {
    throw new ValidationError('season export arrays are required', { field: 'season' });
  }
  const plotById = new Map(plots.map((row) => [row.id, row]));
  const cropById = new Map(crops.map((row) => [row.id, row]));
  const plantingById = new Map(plantings.map((row) => [row.id, row]));
  const schedule = plantings.map((row) => ({
    ...row,
    plotName: plotById.get(row.plotId)?.name ?? null,
    cropName: cropById.get(row.cropId)?.name ?? null,
    family: cropById.get(row.cropId)?.family ?? null
  })).sort((left, right) => left.plantedOn.localeCompare(right.plantedOn) || left.id.localeCompare(right.id));
  const yields = harvests.map((row) => {
    const planting = plantingById.get(row.plantingId);
    return {
      ...row,
      plotId: planting?.plotId ?? null,
      cropId: planting?.cropId ?? null,
      plotName: planting ? plotById.get(planting.plotId)?.name ?? null : null,
      cropName: planting ? cropById.get(planting.cropId)?.name ?? null : null
    };
  }).sort((left, right) => left.harvestedOn.localeCompare(right.harvestedOn) || left.id.localeCompare(right.id));
  const rotation = rotationEvents
    .map((row) => ({ ...row, plotName: plotById.get(row.plotId)?.name ?? null }))
    .sort((left, right) => left.plantedOn.localeCompare(right.plantedOn) || left.id.localeCompare(right.id));
  const manifest = {
    format: SEASON_EXPORT_FORMAT,
    version: SEASON_EXPORT_VERSION,
    generatedAt: requireTimestamp(generatedAt),
    counts: {
      plots: plots.length,
      crops: crops.length,
      plantings: schedule.length,
      harvests: yields.length,
      rotationEvents: rotation.length
    }
  };
  const data = { plots, crops, plantings: schedule, harvests: yields, rotationEvents: rotation };
  return {
    manifest,
    data,
    checksum: createHash('sha256').update(JSON.stringify({ manifest, data })).digest('hex')
  };
}

export function seasonPlantingsCsv(plantings) {
  const header = ['planting_id', 'plot', 'crop', 'family', 'planted_on', 'expected_harvest_on', 'status'];
  const lines = plantings.map((row) => [
    row.id,
    row.plotName,
    row.cropName,
    row.family,
    row.plantedOn,
    row.expectedHarvestOn,
    row.status
  ].map(seasonCsvCell).join(','));
  return `${[header.join(','), ...lines].join('\n')}\n`;
}
