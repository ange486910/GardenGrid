import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture(prefix) {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-11-01T08:00:00.000Z') },
    createId: (name) => `${prefix}_${name}_${++counter}`
  });
}

function seed(app) {
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
  app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 2.5, unit: 'kg' });
  app.service.createFrostProfile({ name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' });
  app.service.recordRestPeriod({ plotId: plot.id, kind: 'fallow', startedOn: '2026-08-01', endedOn: '2026-09-01', note: 'summer rest' });
}

test('garden backup restores plots, plantings, harvests and rotation snapshots', () => {
  const source = fixture('source');
  const target = fixture('target');
  try {
    seed(source);
    const backup = source.service.exportBackup();
    const result = target.service.restoreBackup(backup);
    assert.equal(result.restored.plantings, 1);
    assert.equal(result.restored.restPeriods, 1);
    assert.equal(target.service.listHarvests().length, 1);
    assert.equal(target.service.listRotationEvents().length, 1);
    assert.equal(target.service.listFrostProfiles().length, 1);
    assert.equal(target.service.listRestPeriods()[0].kind, 'fallow');
  } finally { source.close(); target.close(); }
});

test('garden restore refuses populated data and rolls back constraint failures', () => {
  const source = fixture('source');
  const target = fixture('target');
  try {
    seed(source);
    const backup = source.service.exportBackup();
    target.service.createPlot({ name: 'Occupied', areaSqm: 1 });
    assert.throws(() => target.service.restoreBackup(backup), (error) => error.name === 'ConflictError');
  } finally { source.close(); target.close(); }
});
