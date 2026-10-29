import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, { clock: { now: () => new Date('2026-10-29T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` });
}

test('garden service records harvests and reports yield', () => {
  const app = fixture();
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-08-01' });
    app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-10-20', quantity: 2.5, unit: 'kg' });
    app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-10-27', quantity: 1.5, unit: 'kg' });
    const report = app.service.yieldReport();
    assert.equal(report.totalHarvests, 2);
    const entry = report.byCrop[0];
    assert.equal(entry.cropName, 'Tomato');
    assert.equal(entry.totalQuantity, 4);
    assert.equal(entry.averagePerPlanting, 4);
    assert.equal(entry.harvestCount, 2);
    assert.throws(() => app.service.recordHarvest({ plantingId: 'missing', harvestedOn: '2026-10-20', quantity: 1, unit: 'kg' }), (error) => error.name === 'NotFoundError');
  } finally { app.close(); }
});
