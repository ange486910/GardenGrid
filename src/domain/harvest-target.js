import { HARVEST_UNITS, requireNumber } from './garden.js';
import { optionalString, requireEnum, requireInteger, requireObject, requireString } from './validation.js';

export function validateHarvestTargetInput(input = {}) {
  const payload = requireObject(input, 'harvest target');
  return {
    plotId: requireString(payload.plotId, 'plotId', { maxLength: 128 }),
    cropId: requireString(payload.cropId, 'cropId', { maxLength: 128 }),
    season: requireInteger(payload.season, 'season', { min: 2000, max: 2100 }),
    unit: requireEnum(payload.unit, 'unit', HARVEST_UNITS),
    targetQuantity: requireNumber(payload.targetQuantity, 'targetQuantity', { min: 0, max: 1000000 }),
    note: optionalString(payload.note, 'note', { maxLength: 240 })
  };
}

export function createHarvestTarget(input, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return {
    id: createId('harvest_target'),
    ...validateHarvestTargetInput(input),
    createdAt: clock.now().toISOString()
  };
}

export function buildHarvestTargetReport({ targets, yieldRows }) {
  const actualByKey = new Map((yieldRows ?? []).map((row) => [`${row.plotId}:${row.cropId}:${row.unit}`, row]));
  const rows = targets.map((target) => {
    const actual = actualByKey.get(`${target.plotId}:${target.cropId}:${target.unit}`);
    const actualQuantity = actual?.totalQuantity ?? 0;
    const varianceQuantity = Math.round((actualQuantity - target.targetQuantity) * 100) / 100;
    return {
      ...target,
      actualQuantity,
      varianceQuantity,
      completionPercent: Math.round((actualQuantity / target.targetQuantity) * 1000) / 10,
      met: actualQuantity >= target.targetQuantity
    };
  });
  return {
    rows,
    metCount: rows.filter((row) => row.met).length,
    totalCount: rows.length,
    underTargetCount: rows.filter((row) => !row.met).length
  };
}
