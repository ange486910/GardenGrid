import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrostProfile, sowingWindow, validateFrostProfileInput } from '../../src/domain/garden.js';

let counter = 0;
const deps = { clock: { now: () => new Date('2026-10-29T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` };

test('frost profiles validate dates and zone', () => {
  assert.deepEqual(validateFrostProfileInput({ name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' }), {
    name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01'
  });
  assert.throws(() => validateFrostProfileInput({ name: 'X', zone: '5a', lastFrostDate: '2026-10-01', firstFrostDate: '2026-05-15' }), /firstFrostDate/);
  assert.throws(() => validateFrostProfileInput({ name: 'X', zone: '5a', lastFrostDate: 'bad', firstFrostDate: '2026-10-01' }), /lastFrostDate/);
});

test('hardy crops are sown before the last frost, tender crops after', () => {
  const profile = createFrostProfile({ name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' }, deps);
  const hardy = sowingWindow({ id: 'c1', frostHardy: true }, profile);
  const tender = sowingWindow({ id: 'c2', frostHardy: false }, profile);
  assert.deepEqual(hardy, { cropId: 'c1', profileId: profile.id, earliest: '2026-04-17', latest: '2026-05-01', relativeToFrost: 'before' });
  assert.deepEqual(tender, { cropId: 'c2', profileId: profile.id, earliest: '2026-05-22', latest: '2026-06-05', relativeToFrost: 'after' });
  assert.ok(hardy.latest < profile.lastFrostDate);
  assert.ok(tender.earliest > profile.lastFrostDate);
});
