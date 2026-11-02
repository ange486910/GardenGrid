import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-11-03T08:00:00.000Z') }
  });
}

test('service records fallow and cover-crop periods without rotation conflicts', () => {
  const app = fixture();
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const clover = app.service.createCrop({ name: 'Clover', family: 'Fabaceae', daysToHarvest: 60, frostHardy: true });
    const fallow = app.service.recordRestPeriod({
      plotId: plot.id, kind: 'fallow', startedOn: '2026-06-01', endedOn: '2026-07-01', note: 'summer rest'
    });
    const cover = app.service.recordRestPeriod({
      plotId: plot.id, kind: 'cover_crop', cropId: clover.id,
      startedOn: '2026-08-01', endedOn: '2026-09-01', note: 'fix nitrogen'
    });
    assert.equal(fallow.cropId, null);
    assert.equal(cover.cropId, clover.id);
    assert.deepEqual(app.service.listRestPeriods(plot.id).map((row) => row.kind), ['fallow', 'cover_crop']);
    assert.equal(app.service.listRotationEvents().length, 0);
  } finally { app.close(); }
});

test('rest periods and plantings cannot occupy the same bed dates', () => {
  const app = fixture();
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.service.recordRestPeriod({ plotId: plot.id, kind: 'fallow', startedOn: '2026-06-01', endedOn: '2026-07-15' });
    assert.throws(
      () => app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-06-20' }),
      (error) => error.name === 'ConflictError' && error.details.type === 'rest_period'
    );
    assert.throws(
      () => app.service.recordRestPeriod({ plotId: plot.id, kind: 'fallow', startedOn: '2026-07-01', endedOn: '2026-08-01' }),
      (error) => error.name === 'ConflictError' && error.details.type === 'rest_period'
    );
    assert.equal(app.service.listPlantings().length, 0);
  } finally { app.close(); }
});
