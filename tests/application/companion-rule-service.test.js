import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

test('custom companion rules can be created, updated and deleted', () => {
  const app = createApplication({ databasePath: ':memory:' });
  try {
    const rule = app.service.createCompanionRule({ pair: ['Tomato', 'Basil'], type: 'companion', note: 'Grow together' });
    assert.deepEqual(rule.pair, ['basil', 'tomato']);
    assert.equal(app.service.updateCompanionRule(rule.id, { type: 'antagonist', note: 'Keep apart' }).type, 'antagonist');
    assert.equal(app.service.listCompanionRules().length, 1);
    assert.deepEqual(app.service.deleteCompanionRule(rule.id), { id: rule.id, deleted: true });
  } finally { app.close(); }
});

test('duplicate crop pairs and unknown rule ids are rejected', () => {
  const app = createApplication({ databasePath: ':memory:' });
  try {
    const input = { pair: ['tomato', 'basil'], type: 'companion', note: 'Grow together' };
    app.service.createCompanionRule(input);
    assert.throws(() => app.service.createCompanionRule(input), (error) => error.name === 'ConflictError');
    assert.throws(() => app.service.updateCompanionRule('missing', { note: 'x' }), (error) => error.name === 'NotFoundError');
  } finally { app.close(); }
});
