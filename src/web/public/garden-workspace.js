import { buildGardenBoard } from './board-model.js';
import { createGardenApi } from './garden-api.js';
import { clearAndFill, message } from './garden-dom.js';
import { createGardenSubmissionGuard, gardenFormValue, gardenQuantity, setGardenFormBusy } from './garden-forms.js';
import { installBedNavigation, moveBedOrder, prepareBedCards } from './garden-navigation.js';

export async function mountGardenWorkspace(root, options = {}) {
  const api = options.api ?? createGardenApi();
  const plotList = root.querySelector('[data-role="plot-cards"]');
  const warningList = root.querySelector('[data-role="warnings"]');
  const plantForm = root.querySelector('[data-role="plant-form"]');
  const harvestForm = root.querySelector('[data-role="harvest-form"]');
  const targetForm = root.querySelector('[data-role="target-form"]');
  const targetReport = root.querySelector('[data-role="target-report"]');
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const submitPlant = createGardenSubmissionGuard();
  const submitHarvest = createGardenSubmissionGuard();

  async function refresh() {
    message(root, 'Reading garden records');
    try {
      const [plots, crops, plantings, companions] = await Promise.all([
        api.plots(), api.crops(), api.plantings(), api.companions()
      ]);
      const season = Number(today.slice(0, 4));
      const targetData = await api.harvestTargetReport(season);
      const yieldSets = await Promise.all(plots.map((plot) => api.yields(plot.id)));
      const yields = { rows: yieldSets.flatMap((result) => result.rows ?? []) };
      const board = buildGardenBoard({ plots, crops, plantings, yields, companions, today });
      root.querySelector('[data-summary="plantings"]').textContent = String(board.totalPlantings);
      root.querySelector('[data-summary="warnings"]').textContent = String(board.totalWarnings);
      if (plotList) {
        plotList.replaceChildren(...board.cards.map((plot) => {
          const article = root.ownerDocument.createElement('article');
          article.className = plot.warningCount > 0 ? 'bed-card warning' : 'bed-card';
          article.dataset.plotId = plot.id;
          const heading = root.ownerDocument.createElement('h3');
          heading.textContent = plot.plotName ?? plot.name;
          const meta = root.ownerDocument.createElement('p');
          meta.className = 'bed-meta';
          meta.textContent = `${plot.activeCount} active · ${plot.plannedCount} planned${plot.yieldLabel ? ` · ${plot.yieldLabel}` : ''}`;
          const list = root.ownerDocument.createElement('ul');
          for (const planting of plot.plantings) {
            const row = root.ownerDocument.createElement('li');
            row.className = planting.hasCompanionWarning ? 'crop-row flagged' : 'crop-row';
            row.dataset.status = planting.status;
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
        prepareBedCards([...plotList.querySelectorAll('article')]);
      }
      if (targetReport) {
        targetReport.replaceChildren(...targetData.rows.map((row) => {
          const item = root.ownerDocument.createElement('li');
          const plot = plots.find((entry) => entry.id === row.plotId);
          const crop = crops.find((entry) => entry.id === row.cropId);
          item.textContent = `${plot?.name ?? 'Bed'} · ${crop?.name ?? 'Crop'}: ${row.actualQuantity}/${row.targetQuantity} ${row.unit} (${row.completionPercent}%)`;
          item.dataset.met = row.met ? 'true' : 'false';
          return item;
        }));
      }
      if (targetForm) {
        clearAndFill(targetForm.querySelector('[name="plotId"]'), plots, plots[0]?.id, (plot) => plot.name);
        clearAndFill(targetForm.querySelector('[name="cropId"]'), crops, crops[0]?.id, (crop) => crop.name);
        const seasonInput = targetForm.querySelector('[name="season"]');
        if (seasonInput && !seasonInput.value) seasonInput.value = String(season);
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
      clearAndFill(harvestForm?.querySelector('[name="plantingId"]'), plantings, plantings[0]?.id, (planting) => {
        const crop = crops.find((row) => row.id === planting.cropId);
        const plot = plots.find((row) => row.id === planting.plotId);
        return `${plot?.name ?? 'Bed'} · ${crop?.name ?? 'Crop'} · ${planting.plantedOn}`;
      });
      message(root, `Garden updated for ${board.cards.length} beds`);
      return board;
    } catch (error) {
      message(root, error.message);
      throw error;
    }
  }

  plantForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitPlant(async () => {
      setGardenFormBusy(plantForm, true);
      message(root, 'Planting the selected crop');
      try {
        await api.plant({
          plotId: gardenFormValue(plantForm, 'plotId'),
          cropId: gardenFormValue(plantForm, 'cropId'),
          plantedOn: gardenFormValue(plantForm, 'plantedOn')
        });
        await refresh();
      } catch (error) {
        message(root, error.message);
      } finally {
        setGardenFormBusy(plantForm, false);
      }
    });
  });

  harvestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitHarvest(async () => {
      const quantity = gardenQuantity(gardenFormValue(harvestForm, 'quantity'));
      if (quantity === null) {
        message(root, 'Harvest quantity must be greater than zero');
        return;
      }
      setGardenFormBusy(harvestForm, true);
      message(root, 'Recording harvest');
      try {
        await api.recordHarvest({
          plantingId: gardenFormValue(harvestForm, 'plantingId'),
          harvestedOn: gardenFormValue(harvestForm, 'harvestedOn'),
          quantity,
          unit: gardenFormValue(harvestForm, 'unit')
        });
        await refresh();
      } catch (error) {
        message(root, error.message);
      } finally {
        setGardenFormBusy(harvestForm, false);
      }
    });
  });
  targetForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.setHarvestTarget({
        plotId: gardenFormValue(targetForm, 'plotId'),
        cropId: gardenFormValue(targetForm, 'cropId'),
        season: Number(gardenFormValue(targetForm, 'season')),
        targetQuantity: gardenQuantity(gardenFormValue(targetForm, 'targetQuantity')),
        unit: gardenFormValue(targetForm, 'unit')
      });
      await refresh();
      message(root, 'Harvest target saved');
    } catch (error) {
      message(root, error.message);
    }
  });

  root.querySelector('[data-role="refresh"]')?.addEventListener('click', () => refresh().catch(() => {}));
  plotList?.addEventListener('keydown', async (event) => {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const cards = [...plotList.querySelectorAll('article[data-plot-id]')];
    const current = cards.indexOf(event.target.closest('article'));
    if (current < 0) return;
    const ids = moveBedOrder(cards.map((card) => card.dataset.plotId), current, event.key);
    const next = ids.indexOf(cards[current].dataset.plotId);
    if (next === current) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      await api.reorderPlots(ids);
      await refresh();
      plotList.querySelectorAll('article[data-plot-id]')[next]?.focus();
      message(root, `Moved ${cards[current].querySelector('h3')?.textContent ?? 'bed'}`);
    } catch (error) {
      message(root, error.message);
    }
  });
  installBedNavigation(plotList, (text) => message(root, text));
  const plantedOn = plantForm?.querySelector('[name="plantedOn"]');
  if (plantedOn && !plantedOn.value) plantedOn.value = today;
  const harvestedOn = harvestForm?.querySelector('[name="harvestedOn"]');
  if (harvestedOn && !harvestedOn.value) harvestedOn.value = today;
  return { refresh };
}
