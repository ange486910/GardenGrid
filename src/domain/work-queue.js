import { ValidationError } from './validation.js';

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function taskPriority(dueOn, asOf) {
  if (dueOn < asOf) return 'overdue';
  if (dueOn === asOf) return 'today';
  return 'upcoming';
}

function priorityRank(priority) {
  return { overdue: 0, today: 1, upcoming: 2 }[priority] ?? 3;
}

export function harvestWorkTasks({ plantings, crops, plots, asOf, horizonDays = 14, plotId = null }) {
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 365) {
    throw new ValidationError('horizonDays must be an integer between 1 and 365', { field: 'horizonDays' });
  }
  const end = addDays(asOf, horizonDays);
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  return plantings
    .filter((planting) => planting.status === 'active' && planting.expectedHarvestOn <= end)
    .filter((planting) => !plotId || planting.plotId === plotId)
    .map((planting) => {
      const crop = cropById.get(planting.cropId);
      const plot = plotById.get(planting.plotId);
      if (!crop || !plot) return null;
      return {
        id: `harvest:${planting.id}`,
        type: 'harvest',
        sourceId: planting.id,
        plotId: plot.id,
        plotName: plot.name,
        title: `Harvest ${crop.name}`,
        detail: `Expected harvest for ${crop.name}`,
        dueOn: planting.expectedHarvestOn,
        priority: taskPriority(planting.expectedHarvestOn, asOf)
      };
    })
    .filter(Boolean)
    .sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority) || left.dueOn.localeCompare(right.dueOn) || left.title.localeCompare(right.title));
}

export { addDays, priorityRank, taskPriority };