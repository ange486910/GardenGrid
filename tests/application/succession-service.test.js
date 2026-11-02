import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture(prefix) {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-10-31T08:00:00.000Z') },
    createId: (prefixName) => `${prefix}_${prefixName}_${++counter}`
  });
}

function seed(app) {
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 8 });
  const crop = app.service.createCrop({
    name: 'Radish', family: 'Brassicaceae', daysToHarvest: 10, frostHardy: true,
    earliestSowWeeks: -2, latestSowWeeks: 4
  });
  const profile = app.service.createFrostProfile({
    name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01'
  });
  return { plot, crop, profile };
}

test('succession creation persists selected rounds and rotation snapshots together', () => {
  const app = fixture('garden');
  try {
    const { plot, crop, profile } = seed(app);
    const result = app.service.createSuccession({
      plotId: plot.id, cropId: crop.id, profileId: profile.id,
      count: 3, intervalDays: 14, selectedRounds: [3, 1]
    });
    assert.deepEqual(result.plantings.map((row) => row.plantedOn), ['2026-05-01', '2026-05-29']);
    assert.equal(app.service.listPlantings().length, 2);
    assert.equal(app.service.listRotationEvents().length, 2);
    assert.equal(result.rotationEvents[1].family, 'Brassicaceae');
  } finally { app.close(); }
});

test('succession creation rejects existing bed overlap and rolls back snapshot failures', () => {
  const app = fixture('garden');
  try {
    const { plot, crop, profile } = seed(app);
    app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    assert.throws(
      () => app.service.createSuccession({ plotId: plot.id, cropId: crop.id, profileId: profile.id, count: 2, intervalDays: 14 }),
      (error) => error.name === 'ConflictError'
    );
    assert.equal(app.service.listPlantings().length, 1);
  } finally { app.close(); }

  const clean = fixture('clean');
  try {
    const { plot, crop, profile } = seed(clean);
    clean.db.exec(`CREATE TRIGGER fail_succession_rotation BEFORE INSERT ON rotation_events
      BEGIN SELECT RAISE(ABORT, 'simulated succession failure'); END;`);
    assert.throws(
      () => clean.service.createSuccession({ plotId: plot.id, cropId: crop.id, profileId: profile.id, count: 2, intervalDays: 14 }),
      /simulated succession failure/
    );
    assert.equal(clean.service.listPlantings().length, 0);
    assert.equal(clean.service.listRotationEvents().length, 0);
  } finally { clean.close(); }
});
