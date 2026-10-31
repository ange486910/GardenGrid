import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-10-31T08:00:00.000Z') },
    createId: (prefix) => `${prefix}_${++counter}`
  });
}

test('service projects yield by plot and exports the season plan', () => {
  const app = fixture();
  try {
    const bedA = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const bedB = app.service.createPlot({ name: 'Bed B', areaSqm: 4 });
    const tomato = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const plantingA = app.service.plant({ plotId: bedA.id, cropId: tomato.id, plantedOn: '2026-05-01' });
    const plantingB = app.service.plant({ plotId: bedB.id, cropId: tomato.id, plantedOn: '2026-05-15' });
    app.service.recordHarvest({ plantingId: plantingA.id, harvestedOn: '2026-07-10', quantity: 2, unit: 'kg' });
    app.service.recordHarvest({ plantingId: plantingB.id, harvestedOn: '2026-07-20', quantity: 3, unit: 'kg' });

    const projection = app.service.yieldByPlot(bedA.id);
    assert.equal(projection.rows.length, 1);
    assert.equal(projection.rows[0].totalQuantity, 2);
    const all = app.service.exportSeason('json');
    assert.equal(all.body.counts.plantings, 2);
    assert.equal(all.body.plantings[0].plotName, 'Bed A');
    const csv = app.service.exportSeason('csv');
    assert.equal(csv.body.trim().split('\n').length, 3);
    assert.throws(() => app.service.exportSeason('xml'), (error) => error.name === 'ValidationError');
  } finally { app.close(); }
});
