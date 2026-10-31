function rounded(value) {
  return Math.round(value * 100) / 100;
}

export function yieldByPlot({ harvests, plantings, crops, plots, plotId = null }) {
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const plantingById = new Map(plantings.map((planting) => [planting.id, planting]));
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const groups = new Map();
  for (const harvest of harvests) {
    const planting = plantingById.get(harvest.plantingId);
    if (!planting || (plotId && planting.plotId !== plotId)) continue;
    const plot = plotById.get(planting.plotId);
    const crop = cropById.get(planting.cropId);
    if (!plot || !crop) continue;
    const key = `${plot.id}:${crop.id}:${harvest.unit}`;
    if (!groups.has(key)) {
      groups.set(key, {
        plotId: plot.id,
        plotName: plot.name,
        cropId: crop.id,
        cropName: crop.name,
        unit: harvest.unit,
        totalQuantity: 0,
        harvestCount: 0,
        plantingIds: new Set()
      });
    }
    const group = groups.get(key);
    group.totalQuantity += harvest.quantity;
    group.harvestCount += 1;
    group.plantingIds.add(planting.id);
  }
  const rows = [...groups.values()]
    .map((group) => ({
      plotId: group.plotId,
      plotName: group.plotName,
      cropId: group.cropId,
      cropName: group.cropName,
      unit: group.unit,
      totalQuantity: rounded(group.totalQuantity),
      harvestCount: group.harvestCount,
      plantings: group.plantingIds.size,
      averagePerPlanting: rounded(group.totalQuantity / group.plantingIds.size)
    }))
    .sort((left, right) => left.plotName.localeCompare(right.plotName)
      || left.cropName.localeCompare(right.cropName)
      || left.unit.localeCompare(right.unit));
  return {
    plotId,
    totalHarvests: harvests.filter((harvest) => {
      const planting = plantingById.get(harvest.plantingId);
      return planting && (!plotId || planting.plotId === plotId);
    }).length,
    rows
  };
}
