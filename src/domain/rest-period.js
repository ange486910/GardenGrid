import { ValidationError, optionalString, requireDate, requireEnum, requireObject, requireString } from './validation.js';

export const REST_PERIOD_KINDS = Object.freeze(['fallow', 'cover_crop']);

export function validateRestPeriodInput(input = {}) {
  const payload = requireObject(input, 'rest period');
  const kind = requireEnum(payload.kind, 'kind', REST_PERIOD_KINDS);
  const startedOn = requireDate(payload.startedOn, 'startedOn');
  const endedOn = requireDate(payload.endedOn, 'endedOn');
  if (endedOn < startedOn) throw new ValidationError('endedOn must not precede startedOn', { field: 'endedOn' });
  const cropId = optionalString(payload.cropId, 'cropId', { maxLength: 128 });
  if (kind === 'cover_crop' && !cropId) throw new ValidationError('cover crop periods require a cropId', { field: 'cropId' });
  if (kind === 'fallow' && cropId) throw new ValidationError('fallow periods must not reference a crop', { field: 'cropId' });
  return {
    plotId: requireString(payload.plotId, 'plotId', { maxLength: 128 }),
    kind,
    cropId,
    startedOn,
    endedOn,
    note: optionalString(payload.note, 'note', { maxLength: 240 })
  };
}

export function createRestPeriod(input, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return {
    id: createId('rest_period'),
    ...validateRestPeriodInput(input),
    createdAt: clock.now().toISOString()
  };
}

export function dateRangesOverlap(left, right) {
  return left.startedOn <= right.endedOn && right.startedOn <= left.endedOn;
}

export function findRestConflict({ candidate, restPeriods, plantings }) {
  const rest = restPeriods.find((period) => period.plotId === candidate.plotId && dateRangesOverlap(candidate, period));
  if (rest) return { type: 'rest_period', id: rest.id };
  const planting = plantings.find((row) => row.plotId === candidate.plotId && dateRangesOverlap(candidate, {
    startedOn: row.plantedOn,
    endedOn: row.expectedHarvestOn
  }));
  return planting ? { type: 'planting', id: planting.id } : null;
}

export function summarizeRestPeriods({ periods, plotId, from, to }) {
  const clipped = periods
    .filter((period) => period.plotId === plotId && period.startedOn <= to && period.endedOn >= from)
    .map((period) => {
      const startedOn = period.startedOn < from ? from : period.startedOn;
      const endedOn = period.endedOn > to ? to : period.endedOn;
      const days = Math.round((Date.parse(`${endedOn}T00:00:00.000Z`) - Date.parse(`${startedOn}T00:00:00.000Z`)) / 86400000) + 1;
      return { ...period, startedOn, endedOn, days };
    });
  return {
    periods: clipped,
    totalDays: clipped.reduce((sum, period) => sum + period.days, 0)
  };
}
