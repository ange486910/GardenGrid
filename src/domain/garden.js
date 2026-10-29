import { ValidationError, requireDate, requireEnum, requireInteger, requireObject, requireString } from './validation.js';

export const SUN_EXPOSURES = Object.freeze(['full', 'partial', 'shade']);
export const PLANTING_STATUSES = Object.freeze(['planned', 'active', 'harvested']);

export function validatePlotInput(input = {}) {
  return {
    name: requireString(input.name, 'name', { maxLength: 80 }),
    areaSqm: requireInteger(input.areaSqm, 'areaSqm', { min: 1, max: 10000 }),
    sunExposure: requireEnum(input.sunExposure ?? 'full', 'sunExposure', SUN_EXPOSURES)
  };
}

export function createPlot(input, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return { id: createId('plot'), ...validatePlotInput(input), createdAt: clock.now().toISOString() };
}

export function validateCropInput(input = {}) {
  const payload = requireObject(input, 'crop');
  if (typeof payload.frostHardy !== 'boolean') throw new ValidationError('frostHardy must be a boolean', { field: 'frostHardy' });
  return {
    name: requireString(payload.name, 'name', { maxLength: 80 }),
    family: requireString(payload.family, 'family', { maxLength: 60 }),
    daysToHarvest: requireInteger(payload.daysToHarvest, 'daysToHarvest', { min: 1, max: 365 }),
    frostHardy: payload.frostHardy
  };
}

export function createCrop(input, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return { id: createId('crop'), ...validateCropInput(input), createdAt: clock.now().toISOString() };
}

export function addDays(dateOnly, days) {
  const date = new Date(`${requireDate(dateOnly, 'date')}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function expectedHarvestDate(plantedOn, crop) {
  return addDays(plantedOn, crop.daysToHarvest);
}

export function rotationConflict({ crop, plotId, plantings, crops, plantedOn }) {
  const byId = new Map(crops.map((entry) => [entry.id, entry]));
  const threeYearsBefore = addDays(plantedOn, -365 * 3);
  return plantings.some((planting) => {
    if (planting.plotId !== plotId) return false;
    const previous = byId.get(planting.cropId);
    if (!previous || previous.family !== crop.family) return false;
    return planting.plantedOn >= threeYearsBefore && planting.plantedOn <= plantedOn;
  });
}

export function createPlanting(input, crop, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  const payload = requireObject(input, 'planting');
  const plantedOn = requireDate(payload.plantedOn, 'plantedOn');
  return {
    id: createId('planting'),
    plotId: requireString(payload.plotId, 'plotId', { maxLength: 128 }),
    cropId: crop.id,
    plantedOn,
    expectedHarvestOn: expectedHarvestDate(plantedOn, crop),
    status: requireEnum(payload.status ?? 'planned', 'status', PLANTING_STATUSES),
    createdAt: clock.now().toISOString()
  };
}

export function calendarEvents({ plantings, crops, plots, from, to }) {
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const events = [];
  for (const planting of plantings) {
    const crop = cropById.get(planting.cropId);
    const plot = plotById.get(planting.plotId);
    if (!crop || !plot) continue;
    if (planting.plantedOn >= from && planting.plantedOn <= to) events.push({ date: planting.plantedOn, type: 'plant', plantingId: planting.id, crop: crop.name, plot: plot.name });
    if (planting.expectedHarvestOn >= from && planting.expectedHarvestOn <= to) events.push({ date: planting.expectedHarvestOn, type: 'harvest', plantingId: planting.id, crop: crop.name, plot: plot.name });
  }
  return events.sort((left, right) => left.date.localeCompare(right.date) || left.type.localeCompare(right.type));
}

export function validateFrostProfileInput(input = {}) {
  const payload = requireObject(input, 'frostProfile');
  const lastFrostDate = requireDate(payload.lastFrostDate, 'lastFrostDate');
  const firstFrostDate = requireDate(payload.firstFrostDate, 'firstFrostDate');
  if (firstFrostDate < lastFrostDate) throw new ValidationError('firstFrostDate must not precede lastFrostDate', { field: 'firstFrostDate' });
  return {
    name: requireString(payload.name, 'name', { maxLength: 80 }),
    zone: requireString(payload.zone, 'zone', { maxLength: 20 }),
    lastFrostDate,
    firstFrostDate
  };
}

export function createFrostProfile(input, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return { id: createId('frost'), ...validateFrostProfileInput(input), createdAt: clock.now().toISOString() };
}

export function sowingWindow(crop, profile) {
  if (crop.frostHardy) {
    return { cropId: crop.id, profileId: profile.id, earliest: addDays(profile.lastFrostDate, -28), latest: addDays(profile.lastFrostDate, -14), relativeToFrost: 'before' };
  }
  return { cropId: crop.id, profileId: profile.id, earliest: addDays(profile.lastFrostDate, 7), latest: addDays(profile.lastFrostDate, 21), relativeToFrost: 'after' };
}

export const HARVEST_UNITS = Object.freeze(['kg', 'g', 'count', 'bunch']);

export function requireNumber(value, field, options = {}) {
  const { min = 0, max = 1_000_000 } = options;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= min || value > max) throw new ValidationError(`${field} must be a number greater than ${min}`, { field });
  return value;
}

export function validateHarvestInput(input = {}) {
  const payload = requireObject(input, 'harvest');
  return {
    plantingId: requireString(payload.plantingId, 'plantingId', { maxLength: 128 }),
    harvestedOn: requireDate(payload.harvestedOn, 'harvestedOn'),
    quantity: requireNumber(payload.quantity, 'quantity', { min: 0, max: 1000000 }),
    unit: requireEnum(payload.unit, 'unit', HARVEST_UNITS)
  };
}

export function createHarvest(input, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return { id: createId('harvest'), ...validateHarvestInput(input), createdAt: clock.now().toISOString() };
}

export function yieldSummary({ harvests, plantings, crops }) {
  const plantingById = new Map(plantings.map((planting) => [planting.id, planting]));
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const groups = new Map();
  for (const harvest of harvests) {
    const planting = plantingById.get(harvest.plantingId);
    const crop = planting ? cropById.get(planting.cropId) : null;
    if (!crop) continue;
    const key = `${crop.id}:${harvest.unit}`;
    if (!groups.has(key)) groups.set(key, { cropId: crop.id, cropName: crop.name, unit: harvest.unit, totalQuantity: 0, harvestCount: 0, plantingIds: new Set() });
    const group = groups.get(key);
    group.totalQuantity += harvest.quantity;
    group.harvestCount += 1;
    group.plantingIds.add(planting.id);
  }
  const byCrop = [...groups.values()].map((group) => ({
    cropId: group.cropId,
    cropName: group.cropName,
    unit: group.unit,
    totalQuantity: Math.round(group.totalQuantity * 100) / 100,
    harvestCount: group.harvestCount,
    plantings: group.plantingIds.size,
    averagePerPlanting: Math.round((group.totalQuantity / group.plantingIds.size) * 100) / 100
  }));
  return { byCrop, totalHarvests: harvests.length };
}
