import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHarvestTargetReport, validateHarvestTargetInput } from '../../src/domain/harvest-target.js';

test('harvest targets validate season, unit and positive quantity', () => {
  const target = validateHarvestTargetInput({
    plotId: 'bed-a', cropId: 'tomato', season: 2026, unit: 'kg', targetQuantity: 12.5
  });
  assert.equal(target.season, 2026);
  assert.throws(() => validateHarvestTargetInput({ plotId: 'bed-a', cropId: 'tomato', season: 26, unit: 'kg', targetQuantity: 1 }), /season/);
  assert.throws(() => validateHarvestTargetInput({ plotId: 'bed-a', cropId: 'tomato', season: 2026, unit: 'box', targetQuantity: 1 }), /unit/);
  assert.throws(() => validateHarvestTargetInput({ plotId: 'bed-a', cropId: 'tomato', season: 2026, unit: 'kg', targetQuantity: 0 }), /targetQuantity/);
});

test('harvest target report calculates variance and completion', () => {
  const report = buildHarvestTargetReport({
    targets: [
      { id: 't1', plotId: 'bed-a', cropId: 'tomato', unit: 'kg', targetQuantity: 10 },
      { id: 't2', plotId: 'bed-a', cropId: 'lettuce', unit: 'count', targetQuantity: 8 }
    ],
    yieldRows: [
      { plotId: 'bed-a', cropId: 'tomato', unit: 'kg', totalQuantity: 12.5 }
    ]
  });
  assert.equal(report.rows[0].varianceQuantity, 2.5);
  assert.equal(report.rows[0].completionPercent, 125);
  assert.equal(report.rows[0].met, true);
  assert.equal(report.rows[1].actualQuantity, 0);
  assert.equal(report.underTargetCount, 1);
});
