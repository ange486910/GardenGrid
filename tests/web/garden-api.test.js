import test from 'node:test';
import assert from 'node:assert/strict';
import { createGardenApi, GardenApiError } from '../../src/web/public/garden-api.js';

test('garden API client shapes plot queries and tree posts', async () => {
  const calls = [];
  const api = createGardenApi(async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: { id: 'planting_1' } })
    };
  });
  await api.yields('bed a');
  await api.plant({ plotId: 'bed_a', cropId: 'tomato', plantedOn: '2026-05-01' });
  assert.equal(calls[0].path, '/api/v1/yield?plotId=bed%20a');
  assert.equal(JSON.parse(calls[1].options.body).cropId, 'tomato');
});

test('garden API client preserves server conflict details', async () => {
  const api = createGardenApi(async () => ({
    ok: false,
    status: 409,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ error: { message: 'rotation conflict', code: 'conflict' } })
  }));
  await assert.rejects(() => api.plant({}), (error) => {
    assert.ok(error instanceof GardenApiError);
    assert.equal(error.status, 409);
    return true;
  });
});
