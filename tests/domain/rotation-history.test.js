import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrop, createPlot } from '../../src/domain/garden.js';
import { createRotationEvent, hasRecentFamilyConflict, rotationReport, validateRotationEventInput } from '../../src/domain/rotation-history.js';

let counter = 0;
const deps = {
  clock: { now: () => new Date('2026-10-30T08:00:00.000Z') },
  createId: (prefix) => `${prefix}_${++counter}`
};

test('rotation events validate dates and reject a reversed season', () => {
  assert.deepEqual(validateRotationEventInput({ plotId: 'p1', cropId: 'c1', plantedOn: '2025-04-01', endedOn: '2025-07-01' }), {
    plotId: 'p1', cropId: 'c1', plantedOn: '2025-04-01', endedOn: '2025-07-01'
  });
  assert.throws(() => validateRotationEventInput({ plotId: 'p1', cropId: 'c1', plantedOn: '2025-07-01', endedOn: '2025-04-01' }), /precede/);
});

test('rotation report blocks recent families and shows older history', () => {
  const plot = createPlot({ name: 'Bed A', areaSqm: 6 }, deps);
  const tomato = createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false }, deps);
  const lettuce = createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true }, deps);
  const events = [
    createRotationEvent({ plotId: plot.id, cropId: tomato.id, plantedOn: '2024-05-01', endedOn: '2024-08-01' }, tomato, deps),
    createRotationEvent({ plotId: plot.id, cropId: lettuce.id, plantedOn: '2021-04-01', endedOn: '2021-06-01' }, lettuce, deps)
  ];
  const report = rotationReport({ plots: [plot], crops: [tomato, lettuce], events, asOf: '2026-10-30' });

  assert.equal(report.windowStart, '2023-10-31');
  assert.deepEqual(report.plots[0].blockedFamilies, ['Solanaceae']);
  assert.deepEqual(report.plots[0].availableFamilies, ['Asteraceae']);
  assert.equal(report.plots[0].history[0].cropName, 'Tomato');
  assert.equal(report.plots[0].history[1].withinThreeYears, false);
});

test('history conflict uses the family snapshot instead of current crop metadata', () => {
  const crop = { id: 'pepper', name: 'Pepper', family: 'Solanaceae' };
  const events = [{ plotId: 'p1', family: 'Solanaceae', plantedOn: '2024-04-01' }];
  assert.equal(hasRecentFamilyConflict({ crop, plotId: 'p1', events, plantedOn: '2026-04-01' }), true);
  assert.equal(hasRecentFamilyConflict({ crop, plotId: 'p1', events, plantedOn: '2027-04-02' }), false);
});
