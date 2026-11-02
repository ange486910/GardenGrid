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

function conflictingImportFixture(prefix) {
  const source = fixture(`${prefix}_source`);
  const target = fixture(`${prefix}_target`);
  seed(source);
  const plot = target.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const tomato = target.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  const kale = target.service.createCrop({ name: 'Kale', family: 'Brassicaceae', daysToHarvest: 1, frostHardy: true });
  target.service.plant({ plotId: plot.id, cropId: kale.id, plantedOn: '2026-06-01' });
  return { source, target, plot, tomato, snapshot: source.service.exportSeason('json').body };
}

test('reviewed season substitutions apply atomically after a fresh preview', () => {
  const f = conflictingImportFixture('resolve');
  try {
    const preview = f.target.service.importSeason(f.snapshot, { dryRun: true });
    assert.equal(preview.errors.length, 1);
    assert.equal(f.target.service.listPlantings().length, 1);
    const sourcePlanting = f.snapshot.plantings[0];
    const resolutions = {
      format: 'gardengrid-season-resolutions',
      version: 1,
      snapshotChecksum: f.snapshot.checksum,
      resolutions: [{
        plantingId: sourcePlanting.id,
        action: 'replace',
        plotId: f.plot.id,
        cropId: f.tomato.id,
        plantedOn: '2026-06-03',
        expectedHarvestOn: '2026-07-10'
      }]
    };
    const reviewed = f.target.service.importSeason(f.snapshot, { dryRun: true, resolutions });
    assert.equal(reviewed.errors.length, 0);
    assert.match(reviewed.previewToken, /^[a-f0-9]{64}$/);
    const result = f.target.service.importSeason(f.snapshot, { resolutions, previewToken: reviewed.previewToken });
    assert.equal(result.imported.plantings, 1);
    assert.equal(f.target.service.listPlantings().length, 2);
  } finally { f.source.close(); f.target.close(); }
});

test('stale resolution previews cannot apply after the target bed changes', () => {
  const f = conflictingImportFixture('stale');
  try {
    const sourcePlanting = f.snapshot.plantings[0];
    const resolutions = {
      format: 'gardengrid-season-resolutions',
      version: 1,
      snapshotChecksum: f.snapshot.checksum,
      resolutions: [{
        plantingId: sourcePlanting.id,
        action: 'replace',
        plotId: f.plot.id,
        cropId: f.tomato.id,
        plantedOn: '2026-06-03',
        expectedHarvestOn: '2026-07-10'
      }]
    };
    const preview = f.target.service.importSeason(f.snapshot, { dryRun: true, resolutions });
    assert.equal(preview.errors.length, 0);
    const lettuce = f.target.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 40, frostHardy: true });
    f.target.service.plant({ plotId: f.plot.id, cropId: lettuce.id, plantedOn: '2026-07-01' });
    assert.throws(
      () => f.target.service.importSeason(f.snapshot, { resolutions, previewToken: preview.previewToken }),
      (error) => error.name === 'ConflictError' && error.details.field === 'previewToken'
    );
  } finally { f.source.close(); f.target.close(); }
});