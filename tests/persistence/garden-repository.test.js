import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from '../../src/db/connection.js';
import { migrateDatabase } from '../../src/db/migrate.js';
import { GardenRepository } from '../../src/db/repositories/garden-repository.js';
import { createCrop, createPlanting, createPlot } from '../../src/domain/garden.js';

test('migrations create the garden schema and stay idempotent', () => {
  const db = openDatabase(':memory:');
  try {
    assert.deepEqual(migrateDatabase(db), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(migrateDatabase(db), []);
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('plots','crops','plantings','rotation_events','succession_batches') ORDER BY name`).all().map((row) => row.name);
    assert.deepEqual(tables, ['crops', 'plantings', 'plots', 'rotation_events', 'succession_batches']);
  } finally { db.close(); }
});

test('repository archives a crop without deleting its history', () => {
  const db = openDatabase(':memory:');
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    repository.createCrop({ id: 'crop', name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true, createdAt: '2026-11-01T08:00:00.000Z' });
    repository.setCropArchived('crop', '2026-11-02T08:00:00.000Z');
    assert.equal(repository.findCrop('crop').archivedAt, '2026-11-02T08:00:00.000Z');
  } finally { db.close(); }
});

test('repository persists and updates companion rules', () => {
  const db = openDatabase(':memory:');
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    repository.createCompanionRule({ id: 'rule1', pair: ['basil', 'tomato'], type: 'companion', note: 'grow together', createdAt: '2026-11-01T08:00:00.000Z' });
    repository.updateCompanionRule('rule1', { type: 'antagonist', note: 'revised guidance' });
    assert.equal(repository.findCompanionRule('rule1').type, 'antagonist');
    assert.equal(repository.listCompanionRules().length, 1);
    repository.deleteCompanionRule('rule1');
    assert.equal(repository.listCompanionRules().length, 0);
  } finally { db.close(); }
});

test('repository updates and deletes harvests while retaining revisions', () => {
  const db = openDatabase(':memory:');
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    const createdAt = '2026-11-01T08:00:00.000Z';
    repository.createPlot({ id: 'bed', name: 'Bed', areaSqm: 4, sunExposure: 'full', createdAt });
    repository.createCrop({ id: 'crop', name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true, createdAt });
    repository.createPlanting({ id: 'plant', plotId: 'bed', cropId: 'crop', plantedOn: '2026-05-01', expectedHarvestOn: '2026-06-15', status: 'active', createdAt });
    repository.createHarvest({ id: 'harvest', plantingId: 'plant', harvestedOn: '2026-06-15', quantity: 1, unit: 'kg', createdAt });
    const updated = repository.updateHarvest({ id: 'harvest', plantingId: 'plant', harvestedOn: '2026-06-16', quantity: 1.5, unit: 'kg' });
    repository.createHarvestRevision({ id: 'rev1', harvestId: 'harvest', action: 'updated', before: { quantity: 1 }, after: updated, createdAt });
    assert.equal(repository.findHarvest('harvest').quantity, 1.5);
    repository.deleteHarvest('harvest');
    repository.createHarvestRevision({ id: 'rev2', harvestId: 'harvest', action: 'deleted', before: updated, after: null, createdAt });
    assert.equal(repository.findHarvest('harvest'), null);
    assert.deepEqual(repository.listHarvestRevisions().map((row) => row.action), ['updated', 'deleted']);
  } finally { db.close(); }
});

test('repository preserves custom sowing offsets on crops', () => {
  const db = openDatabase(':memory:');
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    const crop = repository.createCrop({
      id: 'cilantro', name: 'Cilantro', family: 'Apiaceae', daysToHarvest: 50, frostHardy: true,
      earliestSowWeeks: -2, latestSowWeeks: 2, createdAt: '2026-10-30T08:00:00.000Z'
    });
    assert.equal(repository.findCrop(crop.id).earliestSowWeeks, -2);
    assert.equal(repository.findCrop(crop.id).latestSowWeeks, 2);
  } finally { db.close(); }
});

test('repository stores crop and family snapshots for rotation history', () => {
  const db = openDatabase(':memory:');
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    const createdAt = '2026-10-30T08:00:00.000Z';
    repository.createPlot({ id: 'bed_a', name: 'Bed A', areaSqm: 6, sunExposure: 'full', createdAt });
    repository.createCrop({ id: 'tomato', name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false, createdAt });
    const event = repository.createRotationEvent({
      id: 'rotation_old', plotId: 'bed_a', cropId: 'tomato', family: 'Solanaceae',
      cropName: 'Tomato', plantedOn: '2023-05-01', endedOn: '2023-08-01', createdAt
    });

    assert.equal(repository.listRotationEventsByPlot('bed_a').length, 1);
    assert.equal(repository.listRotationEventsByPlot('bed_a')[0].cropName, 'Tomato');
    assert.equal(event.family, 'Solanaceae');
    assert.equal(repository.listRotationEvents()[0].endedOn, '2023-08-01');
  } finally { db.close(); }
});

test('repository round-trips plots, crops and plantings', () => {
  const root = join(process.cwd(), 'work', 'gardengrid-tests');
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, 'run-'));
  const db = openDatabase(join(directory, 'test.sqlite'));
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    let counter = 0;
    const deps = { clock: { now: () => new Date('2026-10-28T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` };
    const plot = repository.createPlot(createPlot({ name: 'Bed A', areaSqm: 6 }, deps));
    const crop = repository.createCrop(createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true }, deps));
    const planting = repository.createPlanting(createPlanting({ plotId: plot.id, plantedOn: '2026-10-01' }, crop, deps));

    assert.equal(repository.listPlots()[0].name, 'Bed A');
    assert.equal(repository.listCrops()[0].frostHardy, true);
    assert.equal(repository.listPlantings()[0].expectedHarvestOn, '2026-11-15');
    assert.equal(repository.findPlot(plot.id).areaSqm, 6);
    assert.equal(repository.findCrop(crop.id).family, 'Asteraceae');
    assert.equal(planting.status, 'planned');
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('foreign keys reject plantings without a plot', () => {
  const db = openDatabase(':memory:');
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    assert.throws(() => repository.createPlanting({ id: 'p1', plotId: 'missing', cropId: 'missing', plantedOn: '2026-10-01', expectedHarvestOn: '2026-11-15', status: 'planned', createdAt: '2026-10-28T08:00:00.000Z' }));
  } finally { db.close(); }
});
