import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlotOrder } from '../../src/domain/plot-order.js';

const plots = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('plot order requires every bed exactly once', () => {
  assert.deepEqual(normalizePlotOrder(['c', 'a', 'b'], plots), [
    { id: 'c', displayOrder: 1 },
    { id: 'a', displayOrder: 2 },
    { id: 'b', displayOrder: 3 }
  ]);
  assert.throws(() => normalizePlotOrder(['a', 'b'], plots), /every plot/);
  assert.throws(() => normalizePlotOrder(['a', 'a', 'b'], plots), /every plot/);
  assert.throws(() => normalizePlotOrder(['a', 'b', 'missing'], plots), /every plot/);
});
