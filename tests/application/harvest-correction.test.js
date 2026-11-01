import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-11-01T08:00:00.000Z') },
    createId: (name) => `${name}_${++counter}`
  });
}

function seed(app) {
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
  const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
  const harvest = app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-06-15', quantity: 1, unit: 'kg' });
  return { planting, harvest };
}

test('harvest corrections recalculate yield and retain before/after revisions', () => {
  const app = fixture();
  try {
    const { harvest } = seed(app);
    const updated = app.service.correctHarvest(harvest.id, { quantity: 2.5, harvestedOn: '2026-06-16' });
    assert.equal(updated.quantity, 2.5);
    assert.equal(app.service.yieldByPlot().rows[0].totalQuantity, 2.5);
    const revisions = app.service.listHarvestRevisions();
    assert.equal(revisions[0].action, 'updated');
    assert.equal(revisions[0].before.quantity, 1);
    assert.equal(revisions[0].after.quantity, 2.5);
  } finally { app.close(); }
});

test('deleting a harvest records the removed row and rejects unknown ids', () => {
  const app = fixture();
  try {
    const { harvest } = seed(app);
    assert.deepEqual(app.service.deleteHarvest(harvest.id), { id: harvest.id, deleted: true });
    assert.equal(app.service.listHarvests().length, 0);
    assert.equal(app.service.listHarvestRevisions()[0].action, 'deleted');
    assert.throws(() => app.service.correctHarvest('missing', { quantity: 2 }), (error) => error.name === 'NotFoundError');
  } finally { app.close(); }
});
