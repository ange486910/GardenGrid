import { buildGardenBoard } from './board-model.js';
import { createGardenApi } from './garden-api.js';
import { clearAndFill, message } from './garden-dom.js';

export async function mountGardenWorkspace(root, options = {}) {
  const api = options.api ?? createGardenApi();
  const plotList = root.querySelector('[data-role="plot-cards"]');
  const warningList = root.querySelector('[data-role="warnings"]');
  const plantForm = root.querySelector('[data-role="plant-form"]');
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  async function refresh() {
    message(root, 'Reading garden records');
    try {
      const [plots, crops, plantings, companions] = await Promise.all([
        api.plots(), api.crops(), api.plantings(), api.companions()
      ]);
      const yieldSets = await Promise.all(plots.map((plot) => api.yields(plot.id)));
      const yields = { rows: yieldSets.flatMap((result) => result.rows ?? []) };
      const board = buildGardenBoard({ plots, crops, plantings, yields, companions, today });
      root.querySelector('[data-summary="plantings"]').textContent = String(board.totalPlantings);
      root.querySelector('[data-summary="warnings"]').textContent = String(board.totalWarnings);
      if (plotList) {
        plotList.replaceChildren(...board.cards.map((plot) => {
          const article = root.ownerDocument.createElement('article');
          article.className = plot.warningCount > 0 ? 'bed-card warning' : 'bed-card';
          const heading = root.ownerDocument.createElement('h3');
          heading.textContent = plot.plotName ?? plot.name;
          const meta = root.ownerDocument.createElement('p');
          meta.className = 'bed-meta';
          meta.textContent = `${plot.activeCount} active · ${plot.plannedCount} planned${plot.yieldLabel ? ` · ${plot.yieldLabel}` : ''}`;
          const list = root.ownerDocument.createElement('ul');
          for (const planting of plot.plantings) {
            const row = root.ownerDocument.createElement('li');
            row.className = planting.hasCompanionWarning ? 'crop-row flagged' : 'crop-row';
            row.replaceChildren();
            const name = root.ownerDocument.createElement('strong');
            name.textContent = planting.cropName;
            const detail = root.ownerDocument.createElement('span');
            detail.textContent = `${planting.harvestLabel} · ${planting.daysToHarvest} days`;
            row.append(name, detail);
            list.append(row);
          }
          article.append(heading, meta, list);
          return article;
        }));
      }
      if (warningList) {
        warningList.replaceChildren(...(companions.findings ?? []).map((finding) => {
          const item = root.ownerDocument.createElement('li');
          item.textContent = `${finding.crops?.join(' + ') ?? 'Plant pair'} · ${finding.note}`;
          return item;
        }));
      }
      clearAndFill(plantForm?.querySelector('[name="plotId"]'), plots, plots[0]?.id, (plot) => plot.name);
      clearAndFill(plantForm?.querySelector('[name="cropId"]'), crops, crops[0]?.id, (crop) => crop.name);
      message(root, `Garden updated for ${board.cards.length} beds`);
      return board;
    } catch (error) {
      message(root, error.message);
      throw error;
    }
  }

  plantForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = (name) => plantForm.querySelector(`[name="${name}"]`).value;
    message(root, 'Planting the selected crop');
    try {
      await api.plant({ plotId: value('plotId'), cropId: value('cropId'), plantedOn: value('plantedOn') });
      await refresh();
    } catch (error) {
      message(root, error.message);
    }
  });
  root.querySelector('[data-role="refresh"]')?.addEventListener('click', () => refresh().catch(() => {}));
  const plantedOn = plantForm?.querySelector('[name="plantedOn"]');
  if (plantedOn && !plantedOn.value) plantedOn.value = today;
  return { refresh };
}
