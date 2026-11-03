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


export function restWorkTasks({ restPeriods, plots, asOf, horizonDays = 14, lookbackDays = 7, plotId = null }) {
  const start = addDays(asOf, -lookbackDays);
  const end = addDays(asOf, horizonDays);
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  return restPeriods
    .filter((period) => !plotId || period.plotId === plotId)
    .filter((period) => period.endedOn >= start && period.endedOn <= end)
    .map((period) => {
      const plot = plotById.get(period.plotId);
      if (!plot) return null;
      return {
        id: `bed-release:${period.id}`,
        type: 'bed-release',
        sourceId: period.id,
        plotId: plot.id,
        plotName: plot.name,
        title: period.kind === 'cover' ? `End cover crop in ${plot.name}` : `Prepare ${plot.name}`,
        detail: period.note ?? `Bed rest ends on ${period.endedOn}`,
        dueOn: period.endedOn,
        priority: taskPriority(period.endedOn, asOf)
      };
    })
    .filter(Boolean);
}


export function targetWorkTasks({ harvestTargets = [], yieldRows = [], crops, plots, asOf, horizonDays = 14, lookbackDays = 7, plotId = null }) {
  const start = addDays(asOf, -lookbackDays);
  const end = addDays(asOf, horizonDays);
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const actualByKey = new Map(yieldRows.map((row) => [`${row.plotId}:${row.cropId}:${row.unit}`, row.totalQuantity]));
  return harvestTargets
    .filter((target) => !plotId || target.plotId === plotId)
    .map((target) => {
      const actualQuantity = actualByKey.get(`${target.plotId}:${target.cropId}:${target.unit}`) ?? 0;
      if (actualQuantity >= target.targetQuantity) return null;
      const dueOn = `${target.season}-12-31`;
      if (dueOn < start || dueOn > end) return null;
      const crop = cropById.get(target.cropId);
      const plot = plotById.get(target.plotId);
      if (!crop || !plot) return null;
      const remaining = Math.round((target.targetQuantity - actualQuantity) * 100) / 100;
      return {
        id: `target:${target.id}`,
        type: 'target-review',
        sourceId: target.id,
        plotId: plot.id,
        plotName: plot.name,
        title: `Review ${crop.name} target in ${plot.name}`,
        detail: `${actualQuantity} of ${target.targetQuantity} ${target.unit} harvested; ${remaining} ${target.unit} remaining`,
        dueOn,
        priority: taskPriority(dueOn, asOf)
      };
    })
    .filter(Boolean);
}

export function workQueueSummary(tasks) {
  return {
    total: tasks.length,
    overdue: tasks.filter((task) => task.priority === 'overdue').length,
    today: tasks.filter((task) => task.priority === 'today').length,
    upcoming: tasks.filter((task) => task.priority === 'upcoming').length,
    harvest: tasks.filter((task) => task.type === 'harvest').length,
    bedRelease: tasks.filter((task) => task.type === 'bed-release').length,
    targetReview: tasks.filter((task) => task.type === 'target-review').length
  };
}
export function gardenWorkQueue(options) {
  const tasks = [
    ...harvestWorkTasks(options),
    ...restWorkTasks(options),
    ...targetWorkTasks(options)
  ];
  return tasks.sort((left, right) => (
    priorityRank(left.priority) - priorityRank(right.priority)
    || left.dueOn.localeCompare(right.dueOn)
    || left.type.localeCompare(right.type)
    || left.title.localeCompare(right.title)
  ));
}
export { addDays, priorityRank, taskPriority };