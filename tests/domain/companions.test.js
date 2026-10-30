import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANION_RULES, COMPANION_TYPES, normalizeCropName, validateCompanionRule } from '../../src/domain/companions.js';

test('companion catalog is valid and normalized', () => {
  const rules = COMPANION_RULES.map((rule) => validateCompanionRule(rule));
  assert.ok(rules.length >= 8);
  assert.equal(new Set(rules.map((rule) => rule.id)).size, rules.length);
  for (const rule of rules) {
    assert.equal(rule.pair.length, 2);
    assert.ok(COMPANION_TYPES.includes(rule.type));
  }
});

test('companion rule validation rejects malformed pairs and types', () => {
  assert.deepEqual(validateCompanionRule({ id: 'x', pair: [' Tomato ', 'BASIL'], type: 'companion', note: 'n' }).pair, ['basil', 'tomato']);
  assert.equal(normalizeCropName('  Sweet  Corn '), 'sweet  corn');
  assert.throws(() => validateCompanionRule({ id: 'x', pair: ['a'], type: 'companion', note: 'n' }), /exactly two/);
  assert.throws(() => validateCompanionRule({ id: 'x', pair: ['a', 'a'], type: 'companion', note: 'n' }), /itself/);
  assert.throws(() => validateCompanionRule({ id: 'x', pair: ['a', 'b'], type: 'friendly', note: 'n' }), /type/);
});
