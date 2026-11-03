import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

test('harvest target service compares season yield with target quantity', () => {
  const app = createApplication({ databasePath: ':memory:' });
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 6, unit: 'kg' });
    const target = app.service.setHarvestTarget({ plotId: plot.id, cropId: crop.id, season: 2026, unit: 'kg', targetQuantity: 10 });
    assert.equal(target.season, 2026);
    const report = app.service.harvestTargetReport(2026);
    assert.equal(report.rows[0].actualQuantity, 6);
    assert.equal(report.rows[0].varianceQuantity, -4);
    assert.equal(report.rows[0].completionPercent, 60);
    assert.equal(report.underTargetCount, 1);
    assert.throws(() => app.service.setHarvestTarget({ plotId: plot.id, cropId: crop.id, season: 2026, unit: 'kg', targetQuantity: 12 }), /already exists/);
  } finally { app.close(); }
});
