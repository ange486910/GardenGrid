import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from '../../src/db/connection.js';
import { migrateDatabase } from '../../src/db/migrate.js';
import { GardenRepository } from '../../src/db/repositories/garden-repository.js';
import { createCrop, createHarvest, createPlanting, createPlot } from '../../src/domain/garden.js';

test('repository stores harvests and links them to plantings', () => {
  const root = join(process.cwd(), 'work', 'gardengrid-tests');
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, 'harvest-'));
  const db = openDatabase(join(directory, 'test.sqlite'));
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    let counter = 0;
    const deps = { clock: { now: () => new Date('2026-10-29T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` };
    const plot = repository.createPlot(createPlot({ name: 'Bed A', areaSqm: 6 }, deps));
    const crop = repository.createCrop(createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false }, deps));
    const planting = repository.createPlanting(createPlanting({ plotId: plot.id, plantedOn: '2026-08-01' }, crop, deps));
    const harvest = repository.createHarvest(createHarvest({ plantingId: planting.id, harvestedOn: '2026-10-20', quantity: 2.5, unit: 'kg' }, deps));
    assert.equal(repository.listHarvests().length, 1);
    assert.equal(repository.listHarvestsByPlanting(planting.id)[0].quantity, 2.5);
    assert.equal(repository.listHarvests()[0].unit, 'kg');
    assert.equal(harvest.plantingId, planting.id);
    assert.throws(() => repository.createHarvest({ id: 'h2', plantingId: 'missing', harvestedOn: '2026-10-20', quantity: 1, unit: 'kg', createdAt: '2026-10-29T08:00:00.000Z' }));
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
