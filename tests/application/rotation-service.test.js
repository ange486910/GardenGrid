import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-10-30T08:00:00.000Z') },
    createId: (prefix) => `${prefix}_${++counter}`
  });
}

test('planting records a rotation snapshot and blocks a recent family', () => {
  const app = fixture();
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const tomato = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const pepper = app.service.createCrop({ name: 'Pepper', family: 'Solanaceae', daysToHarvest: 80, frostHardy: false });
    app.service.plant({ plotId: plot.id, cropId: tomato.id, plantedOn: '2025-05-01' });

    assert.equal(app.service.listRotationEvents().length, 1);
    assert.throws(
      () => app.service.plant({ plotId: plot.id, cropId: pepper.id, plantedOn: '2026-05-01' }),
      (error) => error.name === 'ConflictError'
    );
    assert.equal(app.service.listPlantings().length, 1);
  } finally { app.close(); }
});

test('imported rotation history affects planting and appears in the report', () => {
  const app = fixture();
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const tomato = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const lettuce = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.service.recordRotation({ plotId: plot.id, cropId: tomato.id, plantedOn: '2024-05-01', endedOn: '2024-08-01' });

    const report = app.service.rotationReport('2026-10-30');
    assert.deepEqual(report.plots[0].blockedFamilies, ['Solanaceae']);
    assert.deepEqual(report.plots[0].availableFamilies, ['Asteraceae']);
    assert.throws(
      () => app.service.plant({ plotId: plot.id, cropId: tomato.id, plantedOn: '2026-05-01' }),
      (error) => error.name === 'ConflictError'
    );
    const planting = app.service.plant({ plotId: plot.id, cropId: lettuce.id, plantedOn: '2026-05-01' });
    assert.equal(planting.cropId, lettuce.id);
  } finally { app.close(); }
});

test('a failed history insert rolls back the new planting', () => {
  const app = fixture();
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.db.exec(`CREATE TRIGGER fail_rotation_insert BEFORE INSERT ON rotation_events
      BEGIN SELECT RAISE(ABORT, 'simulated rotation failure'); END;`);

    assert.throws(
      () => app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' }),
      /simulated rotation failure/
    );
    assert.equal(app.service.listPlantings().length, 0);
    assert.equal(app.service.listRotationEvents().length, 0);
  } finally { app.close(); }
});
