import { HARVEST_UNITS, PLANTING_STATUSES, requireNumber } from './garden.js';
import { SEASON_EXPORT_FORMAT, SEASON_EXPORT_VERSION, seasonExportChecksum } from './season-export.js';
import { ValidationError, requireDate, requireEnum, requireObject, requireString } from './validation.js';

function requireTimestamp(value, field) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${field} must be an ISO timestamp`, { field });
  }
  return new Date(value).toISOString();
}

function requireArray(value, field) {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`, { field });
  return value;
}

function unique(rows, field) {
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.id)) throw new ValidationError(`${field} ids must be unique`, { field, id: row.id });
    ids.add(row.id);
  }
  return ids;
}

export function validateSeasonImport(input) {
  const payload = requireObject(input, 'season import');
  if (payload.format !== SEASON_EXPORT_FORMAT) {
    throw new ValidationError(`season import format must be ${SEASON_EXPORT_FORMAT}`, { field: 'format' });
  }
  if (payload.version !== SEASON_EXPORT_VERSION) {
    throw new ValidationError(`season import version must be ${SEASON_EXPORT_VERSION}`, { field: 'version' });
  }
  const generatedAt = requireTimestamp(payload.generatedAt, 'generatedAt');
  const plots = requireArray(payload.plots, 'plots').map((row, index) => {
    const value = requireObject(row, `plots[${index}]`);
    return { ...value, id: requireString(value.id, `plots[${index}].id`, { maxLength: 128 }), name: requireString(value.name, `plots[${index}].name`, { maxLength: 80 }) };
  });
  const crops = requireArray(payload.crops, 'crops').map((row, index) => {
    const value = requireObject(row, `crops[${index}]`);
    return {
      ...value,
      id: requireString(value.id, `crops[${index}].id`, { maxLength: 128 }),
      name: requireString(value.name, `crops[${index}].name`, { maxLength: 80 }),
      family: requireString(value.family, `crops[${index}].family`, { maxLength: 60 })
    };
  });
  const plantings = requireArray(payload.plantings, 'plantings').map((row, index) => {
    const value = requireObject(row, `plantings[${index}]`);
    return {
      id: requireString(value.id, `plantings[${index}].id`, { maxLength: 128 }),
      plotId: requireString(value.plotId, `plantings[${index}].plotId`, { maxLength: 128 }),
      cropId: requireString(value.cropId, `plantings[${index}].cropId`, { maxLength: 128 }),
      plantedOn: requireDate(value.plantedOn, `plantings[${index}].plantedOn`),
      expectedHarvestOn: requireDate(value.expectedHarvestOn, `plantings[${index}].expectedHarvestOn`),
      status: requireEnum(value.status, `plantings[${index}].status`, PLANTING_STATUSES),
      createdAt: requireTimestamp(value.createdAt, `plantings[${index}].createdAt`)
    };
  });
  const harvests = requireArray(payload.harvests, 'harvests').map((row, index) => {
    const value = requireObject(row, `harvests[${index}]`);
    return {
      id: requireString(value.id, `harvests[${index}].id`, { maxLength: 128 }),
      plantingId: requireString(value.plantingId, `harvests[${index}].plantingId`, { maxLength: 128 }),
      harvestedOn: requireDate(value.harvestedOn, `harvests[${index}].harvestedOn`),
      quantity: requireNumber(value.quantity, `harvests[${index}].quantity`, { min: 0, max: 1000000 }),
      unit: requireEnum(value.unit, `harvests[${index}].unit`, HARVEST_UNITS),
      createdAt: requireTimestamp(value.createdAt, `harvests[${index}].createdAt`)
    };
  });
  const rotationEvents = requireArray(payload.rotationEvents, 'rotationEvents').map((row, index) => {
    const value = requireObject(row, `rotationEvents[${index}]`);
    return {
      id: requireString(value.id, `rotationEvents[${index}].id`, { maxLength: 128 }),
      plotId: requireString(value.plotId, `rotationEvents[${index}].plotId`, { maxLength: 128 }),
      cropId: requireString(value.cropId, `rotationEvents[${index}].cropId`, { maxLength: 128 }),
      family: requireString(value.family, `rotationEvents[${index}].family`, { maxLength: 60 }),
      cropName: requireString(value.cropName, `rotationEvents[${index}].cropName`, { maxLength: 80 }),
      plantedOn: requireDate(value.plantedOn, `rotationEvents[${index}].plantedOn`),
      endedOn: value.endedOn == null ? null : requireDate(value.endedOn, `rotationEvents[${index}].endedOn`),
      createdAt: requireTimestamp(value.createdAt, `rotationEvents[${index}].createdAt`)
    };
  });
  const plotIds = unique(plots, 'plot');
  const cropIds = unique(crops, 'crop');
  const plantingIds = unique(plantings, 'planting');
  unique(harvests, 'harvest');
  unique(rotationEvents, 'rotation event');
  for (const planting of plantings) {
    if (!plotIds.has(planting.plotId)) throw new ValidationError('planting references an unknown plot', { field: 'plotId', plantingId: planting.id });
    if (!cropIds.has(planting.cropId)) throw new ValidationError('planting references an unknown crop', { field: 'cropId', plantingId: planting.id });
    if (planting.expectedHarvestOn < planting.plantedOn) throw new ValidationError('planting harvest date precedes planting date', { field: 'expectedHarvestOn', plantingId: planting.id });
  }
  for (const harvest of harvests) {
    if (!plantingIds.has(harvest.plantingId)) throw new ValidationError('harvest references an unknown planting', { field: 'plantingId', harvestId: harvest.id });
  }
  for (const event of rotationEvents) {
    if (!plotIds.has(event.plotId) || !cropIds.has(event.cropId)) throw new ValidationError('rotation event references an unknown plot or crop', { field: 'rotationEventId', eventId: event.id });
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
  const counts = {
    plots: plots.length,
    crops: crops.length,
    plantings: schedule.length,
    harvests: yields.length,
    rotationEvents: rotation.length
  };
  if (JSON.stringify(payload.counts) !== JSON.stringify(counts)) {
    throw new ValidationError('season import counts do not match its payload', { field: 'counts' });
  }
  const manifest = { format: payload.format, version: payload.version, generatedAt, counts };
  const data = { plots, crops, plantings: schedule, harvests: yields, rotationEvents: rotation };
  const checksum = seasonExportChecksum(manifest, data);
  if (typeof payload.checksum !== 'string' || payload.checksum !== checksum) {
    throw new ValidationError('season import checksum does not match its payload', { field: 'checksum' });
  }
  return { ...manifest, checksum, ...data };
}

function overlaps(left, right) {
  return left.plantedOn <= right.expectedHarvestOn && right.plantedOn <= left.expectedHarvestOn;
}

export function analyzeSeasonImport({ snapshot, plots, crops, plantings }) {
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const plotByName = new Map(plots.map((plot) => [plot.name.toLowerCase(), plot]));
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const cropByName = new Map(crops.map((crop) => [crop.name.toLowerCase(), crop]));
  const existingKeys = new Set(plantings.map((row) => `${row.plotId}:${row.cropId}:${row.plantedOn}`));
  const accepted = [];
  const skipped = [];
  const errors = [];
  for (const row of snapshot.plantings) {
    const sourcePlot = snapshot.plots.find((plot) => plot.id === row.plotId);
    const sourceCrop = snapshot.crops.find((crop) => crop.id === row.cropId);
    const plot = plotById.get(row.plotId)
      ?? (sourcePlot ? plotByName.get(sourcePlot.name.toLowerCase()) : null);
    const crop = cropById.get(row.cropId)
      ?? (sourceCrop ? cropByName.get(sourceCrop.name.toLowerCase()) : null);
    if (!plot) {
      errors.push({ plantingId: row.id, reason: 'plot not found by id or name', plotId: row.plotId });
      continue;
    }
    if (!crop) {
      errors.push({ plantingId: row.id, reason: 'crop not found by id or name', cropId: row.cropId });
      continue;
    }
    const key = `${plot.id}:${crop.id}:${row.plantedOn}`;
    if (existingKeys.has(key)) {
      skipped.push({ plantingId: row.id, reason: 'exact planting already exists', plotId: plot.id, cropId: crop.id, plantedOn: row.plantedOn });
      continue;
    }
    const candidate = { ...row, plotId: plot.id, cropId: crop.id, plotName: plot.name, cropName: crop.name };
    const conflict = [...plantings, ...accepted].find((other) => (
      other.plotId === plot.id && overlaps(candidate, other)
    ));
    if (conflict) {
      errors.push({
        plantingId: row.id,
        reason: 'plot is occupied during the imported date range',
        plotId: plot.id,
        conflictPlantingId: conflict.id
      });
      continue;
    }
    accepted.push(candidate);
    existingKeys.add(key);
  }
  return { ready: accepted, skipped, errors };
}
