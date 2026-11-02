import { ValidationError, requireInteger, requireObject, requireString } from './validation.js';

function overlaps(left, right) {
  return left.plantedOn <= right.expectedHarvestOn && right.plantedOn <= left.expectedHarvestOn;
}

export function successionPlantingDrafts({ plan, plotId, cropId, selectedRounds }) {
  const payload = requireObject(plan, 'succession plan');
  const normalizedPlotId = requireString(plotId, 'plotId', { maxLength: 128 });
  const normalizedCropId = requireString(cropId, 'cropId', { maxLength: 128 });
  if (!Array.isArray(payload.rounds) || payload.rounds.length === 0) {
    throw new ValidationError('succession plan must contain rounds', { field: 'rounds' });
  }
  const requested = selectedRounds == null ? payload.rounds.map((_, index) => index + 1) : selectedRounds;
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new ValidationError('selectedRounds must be a non-empty array', { field: 'selectedRounds' });
  }
  const numbers = requested.map((value, index) => requireInteger(value, `selectedRounds[${index}]`, {
    min: 1,
    max: payload.rounds.length
  }));
  if (new Set(numbers).size !== numbers.length) {
    throw new ValidationError('selectedRounds must not contain duplicates', { field: 'selectedRounds' });
  }
  const drafts = [...numbers]
    .sort((left, right) => left - right)
    .map((round) => ({
      round,
      plotId: normalizedPlotId,
      cropId: normalizedCropId,
      plantedOn: payload.rounds[round - 1].sowOn,
      expectedHarvestOn: payload.rounds[round - 1].expectedHarvestOn,
      status: 'planned'
    }));
  for (let index = 1; index < drafts.length; index += 1) {
    if (overlaps(drafts[index - 1], drafts[index])) {
      throw new ValidationError('selected succession rounds overlap in the plot', {
        field: 'selectedRounds',
        previousRound: drafts[index - 1].round,
        round: drafts[index].round
      });
    }
  }
  return drafts;
}

export function findPlotOverlap(drafts, plantings) {
  for (const draft of drafts) {
    const conflict = plantings.find((planting) => planting.plotId === draft.plotId && overlaps(draft, planting));
    if (conflict) return { draft, conflict };
  }
  return null;
}
