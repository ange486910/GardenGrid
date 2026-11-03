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
  await api.reorderPlots(['bed_b', 'bed_a']);
  await api.harvestTargets(2026);
  await api.harvestTargetReport(2026);
  await api.calendarIcs('2026-01-01', '2026-12-31', 'bed a');
  await api.workQueue('2026-11-03', 7, 'bed a');
  assert.equal(calls[0].path, '/api/v1/yield?plotId=bed%20a');
  assert.equal(JSON.parse(calls[1].options.body).cropId, 'tomato');
  assert.equal(calls[2].path, '/api/v1/plots/order');
  assert.deepEqual(JSON.parse(calls[2].options.body).plotIds, ['bed_b', 'bed_a']);
  assert.equal(calls[3].path, '/api/v1/harvest-targets?season=2026');
  assert.equal(calls[4].path, '/api/v1/harvest-targets/report?season=2026');
  assert.equal(calls[5].path, '/api/v1/calendar.ics?from=2026-01-01&to=2026-12-31&plotId=bed%20a');
  assert.equal(calls[6].path, '/api/v1/work-queue?asOf=2026-11-03&horizonDays=7&plotId=bed%20a');
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
