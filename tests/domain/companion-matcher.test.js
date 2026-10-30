import test from 'node:test';
import assert from 'node:assert/strict';
import { findCompanionIssues } from '../../src/domain/companion-matcher.js';

const crops = [
  { id: 'c1', name: 'Tomato' }, { id: 'c2', name: 'Basil' }, { id: 'c3', name: 'Potato' }, { id: 'c4', name: 'Lettuce' }
];
const plots = [{ id: 'p1', name: 'Bed A' }, { id: 'p2', name: 'Bed B' }];
const planting = (id, plotId, cropId, status = 'active') => ({ id, plotId, cropId, status });

test('matcher finds companion and antagonist pairs in the same plot', () => {
  const findings = findCompanionIssues({
    plantings: [planting('x1', 'p1', 'c1'), planting('x2', 'p1', 'c2'), planting('x3', 'p1', 'c3')],
    crops,
    plots
  });
  assert.deepEqual(findings.map((finding) => finding.ruleId), ['tomato-potato', 'tomato-basil']);
  assert.equal(findings[0].type, 'antagonist');
  assert.equal(findings[1].type, 'companion');
  assert.equal(findings[0].plotName, 'Bed A');
});

test('matcher ignores different plots and harvested plantings', () => {
  assert.deepEqual(findCompanionIssues({ plantings: [planting('x1', 'p1', 'c1'), planting('x2', 'p2', 'c3')], crops, plots }), []);
  assert.deepEqual(findCompanionIssues({ plantings: [planting('x1', 'p1', 'c1', 'harvested'), planting('x2', 'p1', 'c3')], crops, plots }), []);
});
