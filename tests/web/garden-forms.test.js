import test from 'node:test';
import assert from 'node:assert/strict';
import { createGardenSubmissionGuard, gardenQuantity, setGardenFormBusy } from '../../src/web/public/garden-forms.js';

test('garden quantities reject zero, negatives and non-numbers', () => {
  assert.equal(gardenQuantity('2.5'), 2.5);
  assert.equal(gardenQuantity('0'), null);
  assert.equal(gardenQuantity('-1'), null);
  assert.equal(gardenQuantity('many'), null);
});

test('garden form guard serializes repeated submissions', async () => {
  const run = createGardenSubmissionGuard();
  let release;
  let calls = 0;
  const first = run(async () => {
    calls += 1;
    await new Promise((resolve) => { release = resolve; });
  });
  assert.equal(await run(async () => { calls += 1; }), false);
  release();
  assert.equal(await first, true);
  assert.equal(calls, 1);
});

test('garden form busy helper updates controls and aria state', () => {
  const input = { disabled: false };
  const form = {
    attributes: new Map(),
    querySelectorAll: () => [input],
    setAttribute(name, value) { this.attributes.set(name, value); }
  };
  setGardenFormBusy(form, true);
  assert.equal(input.disabled, true);
  assert.equal(form.attributes.get('aria-busy'), 'true');
});
