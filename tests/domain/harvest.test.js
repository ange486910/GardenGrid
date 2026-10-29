import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarvest, validateHarvestInput, yieldSummary } from '../../src/domain/garden.js';

let counter = 0;
const deps = { clock: { now: () => new Date('2026-10-29T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` };

test('harvest input validates planting, date, quantity and unit', () => {
  assert.deepEqual(validateHarvestInput({ plantingId: 'p1', harvestedOn: '2026-10-29', quantity: 2.5, unit: 'kg' }), { plantingId: 'p1', harvestedOn: '2026-10-29', quantity: 2.5, unit: 'kg' });
  assert.throws(() => validateHarvestInput({ plantingId: 'p1', harvestedOn: '2026-10-29', quantity: 0, unit: 'kg' }), /quantity/);
  assert.throws(() => validateHarvestInput({ plantingId: 'p1', harvestedOn: '2026-10-29', quantity: 1, unit: 'bucket' }), /unit/);
  assert.throws(() => validateHarvestInput({ plantingId: 'p1', harvestedOn: 'bad', quantity: 1, unit: 'kg' }), /harvestedOn/);
});

test('yield summary aggregates by crop and unit', () => {
  const crops = [{ id: 'c1', name: 'Tomato' }, { id: 'c2', name: 'Lettuce' }];
  const plantings = [{ id: 'p1', cropId: 'c1' }, { id: 'p2', cropId: 'c1' }, { id: 'p3', cropId: 'c2' }];
  const harvests = [
    createHarvest({ plantingId: 'p1', harvestedOn: '2026-10-29', quantity: 2, unit: 'kg' }, deps),
    createHarvest({ plantingId: 'p2', harvestedOn: '2026-10-29', quantity: 3, unit: 'kg' }, deps),
    createHarvest({ plantingId: 'p3', harvestedOn: '2026-10-29', quantity: 4, unit: 'count' }, deps)
  ];
  const summary = yieldSummary({ harvests, plantings, crops });
  assert.equal(summary.totalHarvests, 3);
  const tomato = summary.byCrop.find((entry) => entry.cropId === 'c1');
  assert.equal(tomato.totalQuantity, 5);
  assert.equal(tomato.plantings, 2);
  assert.equal(tomato.averagePerPlanting, 2.5);
  assert.equal(summary.byCrop.find((entry) => entry.cropId === 'c2').unit, 'count');
});
