import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture(prefix) {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, {
    clock: { now: () => new Date('2026-10-31T08:00:00.000Z') },
    createId: (name) => `${prefix}_${name}_${++counter}`
  });
}

function seed(app) {
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
  app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 2.5, unit: 'kg' });
  return { plot, crop, planting };
}

test('season import dry-runs and recreates plantings and harvests in one transaction', () => {
  const source = fixture('source');
  const target = fixture('target');
  try {
    seed(source);
    seed(target);
    const snapshot = source.service.exportSeason('json').body;
    const before = target.service.listPlantings().length;
    const preview = target.service.importSeason(snapshot, { dryRun: true });
    assert.equal(preview.skipped, 1);
    assert.equal(target.service.listPlantings().length, before);

    const emptyTarget = fixture('empty');
    try {
      emptyTarget.service.createPlot({ name: 'Bed A', areaSqm: 6 });
      emptyTarget.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
      const result = emptyTarget.service.importSeason(snapshot);
      assert.equal(result.imported.plantings, 1);
      assert.equal(result.imported.harvests, 1);
      assert.equal(emptyTarget.service.listPlantings().length, 1);
      assert.equal(emptyTarget.service.yieldByPlot().rows[0].totalQuantity, 2.5);
    } finally { emptyTarget.close(); }
  } finally {
    source.close();
    target.close();
  }
});

test('a failed rotation snapshot rolls back the whole season import', () => {
  const source = fixture('source');
  const target = fixture('target');
  try {
    seed(source);
    const snapshot = source.service.exportSeason('json').body;
    target.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    target.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    target.db.exec(`CREATE TRIGGER fail_season_rotation BEFORE INSERT ON rotation_events
      BEGIN SELECT RAISE(ABORT, 'simulated season import failure'); END;`);
    assert.throws(() => target.service.importSeason(snapshot), /simulated season import failure/);
    assert.equal(target.service.listPlantings().length, 0);
    assert.equal(target.service.listHarvests().length, 0);
  } finally {
    source.close();
    target.close();
  }
});
