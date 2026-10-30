import { addDays } from './garden.js';
import { ValidationError, requireDate, requireObject, requireString } from './validation.js';

const ROTATION_YEARS = 3;

export function validateRotationEventInput(input = {}) {
  const payload = requireObject(input, 'rotation event');
  const plantedOn = requireDate(payload.plantedOn, 'plantedOn');
  const endedOn = payload.endedOn == null ? null : requireDate(payload.endedOn, 'endedOn');
  if (endedOn && endedOn < plantedOn) {
    throw new ValidationError('endedOn must not precede plantedOn', { field: 'endedOn' });
  }
  return {
    plotId: requireString(payload.plotId, 'plotId', { maxLength: 128 }),
    cropId: requireString(payload.cropId, 'cropId', { maxLength: 128 }),
    plantedOn,
    endedOn
  };
}

export function createRotationEvent(input, crop, dependencies = {}) {
  const clock = dependencies.clock ?? { now: () => new Date() };
  const createId = dependencies.createId ?? ((prefix) => `${prefix}_${Date.now()}`);
  return {
    id: createId('rotation'),
    ...validateRotationEventInput(input),
    family: crop.family,
    cropName: crop.name,
    createdAt: clock.now().toISOString()
  };
}

export function hasRecentFamilyConflict({ crop, plotId, events, plantedOn }) {
  const windowStart = addDays(plantedOn, -365 * ROTATION_YEARS);
  return events.some((event) => (
    event.plotId === plotId
    && event.family === crop.family
    && event.plantedOn >= windowStart
    && event.plantedOn <= plantedOn
  ));
}

export function rotationReport({ plots, crops, events, asOf }) {
  const referenceDate = requireDate(asOf, 'asOf');
  const windowStart = addDays(referenceDate, -365 * ROTATION_YEARS);
  const rows = plots.map((plot) => {
    const plotEvents = events
      .filter((event) => event.plotId === plot.id && event.plantedOn <= referenceDate)
      .sort((left, right) => right.plantedOn.localeCompare(left.plantedOn) || right.id.localeCompare(left.id));
    const recent = plotEvents.filter((event) => event.plantedOn >= windowStart);
    const blockedFamilies = [...new Set(recent.map((event) => event.family))].sort();
    const availableFamilies = [...new Set(crops.map((crop) => crop.family))]
      .filter((family) => !blockedFamilies.includes(family))
      .sort();
    return {
      plotId: plot.id,
      plotName: plot.name,
      blockedFamilies,
      availableFamilies,
      history: plotEvents.map((event) => ({ ...event, withinThreeYears: event.plantedOn >= windowStart }))
    };
  });
  return { asOf: referenceDate, windowStart, plots: rows };
}
