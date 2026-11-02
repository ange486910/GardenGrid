import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

test('archiving a crop blocks new plantings but keeps old records', () => {
  const app = createApplication({ databasePath: ':memory:' });
  try {
    const plot = app.service.createPlot({ name: 'Bed', areaSqm: 4 });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    const archived = app.service.archiveCrop(crop.id);
    assert.ok(archived.archivedAt);
    assert.throws(() => app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2027-05-01' }), (error) => error.name === 'ConflictError');
    assert.equal(app.service.listPlantings().length, 1);
    assert.equal(app.service.restoreCrop(crop.id).archivedAt, null);
  } finally { app.close(); }
});
