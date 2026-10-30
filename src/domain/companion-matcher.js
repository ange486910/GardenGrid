import { COMPANION_RULES, normalizeCropName } from './companions.js';

const TYPE_ORDER = Object.freeze({ antagonist: 0, companion: 1 });

export function findCompanionIssues({ plantings, crops, plots, rules = COMPANION_RULES }) {
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const byPlot = new Map();
  for (const planting of plantings) {
    if (planting.status === 'harvested') continue;
    if (!cropById.has(planting.cropId) || !plotById.has(planting.plotId)) continue;
    if (!byPlot.has(planting.plotId)) byPlot.set(planting.plotId, []);
    byPlot.get(planting.plotId).push(planting);
  }
  const ruleIndex = new Map();
  for (const rule of rules) {
    const pair = [...rule.pair].map(normalizeCropName).sort();
    ruleIndex.set(`${pair[0]}\u0000${pair[1]}`, { ...rule, pair });
  }
  const findings = [];
  for (const [plotId, rows] of byPlot) {
    const plot = plotById.get(plotId);
    for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < rows.length; rightIndex += 1) {
        const leftCrop = cropById.get(rows[leftIndex].cropId);
        const rightCrop = cropById.get(rows[rightIndex].cropId);
        if (!leftCrop || !rightCrop || leftCrop.id === rightCrop.id) continue;
        const pair = [normalizeCropName(leftCrop.name), normalizeCropName(rightCrop.name)].sort();
        const rule = ruleIndex.get(`${pair[0]}\u0000${pair[1]}`);
        if (!rule) continue;
        findings.push({
          ruleId: rule.id,
          type: rule.type,
          note: rule.note,
          plotId,
          plotName: plot.name,
          crops: [leftCrop.name, rightCrop.name]
        });
      }
    }
  }
  return findings.sort((left, right) => (TYPE_ORDER[left.type] - TYPE_ORDER[right.type]) || left.plotName.localeCompare(right.plotName) || left.ruleId.localeCompare(right.ruleId));
}
