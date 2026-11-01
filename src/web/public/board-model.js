import { daysUntil, quantityLabel, shortDate } from './garden-format.js';

export function buildGardenBoard({ plots, crops, plantings, yields, companions, today }) {
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const yieldByPlot = new Map((yields?.byPlot ?? yields?.rows ?? []).map((row) => [row.plotId, row]));
  const warningPairs = new Set((companions?.findings ?? []).flatMap((finding) => (
    (finding.crops ?? []).map((cropName) => `${finding.plotId}:${cropName.toLowerCase()}`)
  )));
  const cards = plots.map((plot) => {
    const rows = plantings
      .filter((planting) => planting.plotId === plot.id)
      .map((planting) => {
        const crop = cropById.get(planting.cropId);
        return {
          ...planting,
          cropName: crop?.name ?? 'Unknown crop',
          family: crop?.family ?? '',
          plantedLabel: shortDate(planting.plantedOn),
          harvestLabel: shortDate(planting.expectedHarvestOn),
          daysToHarvest: daysUntil(planting.expectedHarvestOn, today),
          hasCompanionWarning: warningPairs.has(`${plot.id}:${(crop?.name ?? '').toLowerCase()}`)
        };
      })
      .sort((left, right) => left.expectedHarvestOn.localeCompare(right.expectedHarvestOn));
    const yieldRow = yieldByPlot.get(plot.id);
    return {
      ...plot,
      plantings: rows,
      activeCount: rows.filter((row) => row.status === 'active').length,
      plannedCount: rows.filter((row) => row.status === 'planned').length,
      warningCount: rows.filter((row) => row.hasCompanionWarning).length,
      yieldLabel: yieldRow ? quantityLabel(yieldRow.totalQuantity, yieldRow.unit) : null
    };
  });
  return {
    cards,
    totalPlantings: plantings.length,
    totalWarnings: companions?.findings?.length ?? 0,
    plotsWithWarnings: cards.filter((card) => card.warningCount > 0).length
  };
}
