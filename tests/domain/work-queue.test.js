import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenWorkQueue, harvestWorkTasks, restWorkTasks } from '../../src/domain/work-queue.js';

const plots = [{ id: 'a', name: 'Bed A' }, { id: 'b', name: 'Bed B' }];
const crops = [{ id: 'tomato', name: 'Tomato' }, { id: 'lettuce', name: 'Lettuce' }];
const plantings = [
  { id: 'p1', plotId: 'a', cropId: 'tomato', plantedOn: '2026-05-01', expectedHarvestOn: '2026-11-01', status: 'active' },
  { id: 'p2', plotId: 'b', cropId: 'lettuce', plantedOn: '2026-09-01', expectedHarvestOn: '2026-11-05', status: 'active' },
  { id: 'p3', plotId: 'a', cropId: 'lettuce', plantedOn: '2026-09-10', expectedHarvestOn: '2026-11-03', status: 'active' },
  { id: 'p4', plotId: 'a', cropId: 'tomato', plantedOn: '2026-01-01', expectedHarvestOn: '2026-10-20', status: 'harvested' }
];

test('work queue prioritizes overdue, today and upcoming harvests', () => {
  const tasks = harvestWorkTasks({ plantings, crops, plots, asOf: '2026-11-03', horizonDays: 7 });
  assert.deepEqual(tasks.map((task) => task.priority), ['overdue', 'today', 'upcoming']);
  assert.deepEqual(tasks.map((task) => task.id), ['harvest:p1', 'harvest:p3', 'harvest:p2']);
  assert.equal(tasks[1].title, 'Harvest Lettuce');
});

test('work queue filters by bed and excludes future or inactive plantings', () => {
  assert.deepEqual(harvestWorkTasks({ plantings, crops, plots, asOf: '2026-11-03', plotId: 'a' }).map((task) => task.id), ['harvest:p1', 'harvest:p3']);
  assert.deepEqual(harvestWorkTasks({ plantings, crops, plots, asOf: '2026-10-31', horizonDays: 1 }).map((task) => task.id), ['harvest:p1']);
  assert.throws(() => harvestWorkTasks({ plantings, crops, plots, asOf: '2026-11-03', horizonDays: 0 }), /horizonDays/);
});test('bed rest tasks cover upcoming and recently overdue releases', () => {
  const restPeriods = [
    { id: 'r1', plotId: 'a', kind: 'fallow', startedOn: '2026-09-01', endedOn: '2026-10-30', note: 'Broadfork and compost' },
    { id: 'r2', plotId: 'b', kind: 'cover', startedOn: '2026-09-01', endedOn: '2026-11-08', note: null },
    { id: 'r3', plotId: 'a', kind: 'fallow', startedOn: '2026-01-01', endedOn: '2026-10-01', note: null }
  ];
  const tasks = restWorkTasks({ restPeriods, plots, asOf: '2026-11-03', horizonDays: 7, lookbackDays: 7 });
  assert.deepEqual(tasks.map((task) => task.id), ['bed-release:r1', 'bed-release:r2']);
  assert.equal(tasks[0].priority, 'overdue');
  assert.equal(tasks[0].detail, 'Broadfork and compost');
  assert.match(tasks[1].title, /End cover crop/);
});

test('combined garden queue orders every task by urgency and date', () => {
  const restPeriods = [{ id: 'r1', plotId: 'a', kind: 'fallow', startedOn: '2026-09-01', endedOn: '2026-11-03', note: null }];
  const tasks = gardenWorkQueue({ plantings, crops, plots, restPeriods, asOf: '2026-11-03', horizonDays: 7 });
  assert.deepEqual(tasks.map((task) => task.id), ['harvest:p1', 'bed-release:r1', 'harvest:p3', 'harvest:p2']);
});