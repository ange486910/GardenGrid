import test from 'node:test';
import assert from 'node:assert/strict';
import { yieldByPlot } from '../../src/domain/season-analytics.js';

const plots = [
  { id: 'bed_a', name: 'Bed A' },
  { id: 'bed_b', name: 'Bed B' }
];
const crops = [
  { id: 'tomato', name: 'Tomato' },
  { id: 'lettuce', name: 'Lettuce' }
];
const plantings = [
  { id: 'p1', plotId: 'bed_a', cropId: 'tomato' },
  { id: 'p2', plotId: 'bed_b', cropId: 'tomato' },
  { id: 'p3', plotId: 'bed_a', cropId: 'lettuce' }
];
const harvests = [
  { plantingId: 'p1', quantity: 2.5, unit: 'kg' },
  { plantingId: 'p1', quantity: 1.5, unit: 'kg' },
  { plantingId: 'p2', quantity: 3, unit: 'kg' },
  { plantingId: 'p3', quantity: 4, unit: 'count' }
];

test('yield projection groups harvests by plot, crop and unit', () => {
  const report = yieldByPlot({ harvests, plantings, crops, plots });
  assert.equal(report.rows.length, 3);
  const bedA = report.rows.find((row) => row.plotId === 'bed_a' && row.cropId === 'tomato');
  assert.equal(bedA.totalQuantity, 4);
  assert.equal(bedA.harvestCount, 2);
  assert.equal(bedA.averagePerPlanting, 4);
});

test('yield projection can filter to one plot', () => {
  const report = yieldByPlot({ harvests, plantings, crops, plots, plotId: 'bed_b' });
  assert.equal(report.totalHarvests, 1);
  assert.deepEqual(report.rows.map((row) => row.plotName), ['Bed B']);
  assert.equal(report.rows[0].totalQuantity, 3);
});
