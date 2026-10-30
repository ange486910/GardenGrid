import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

async function fixture() {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  return { json, close: () => new Promise((resolve) => server.close(() => { app.close(); resolve(); })) };
}

test('frost API creates profiles and returns sowing windows', async () => {
  const f = await fixture();
  try {
    const profile = await f.json('/api/v1/frost-profiles', 'POST', { name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' });
    assert.equal(profile.status, 201);
    const crop = await f.json('/api/v1/crops', 'POST', { name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    assert.equal(crop.status, 201);
    const window = await f.json(`/api/v1/frost-profiles/${profile.body.data.id}/windows/${crop.body.data.id}`);
    assert.equal(window.status, 200);
    assert.equal(window.body.data.earliest, '2026-05-22');
    assert.equal(window.body.data.latest, '2026-06-05');
    assert.equal((await f.json('/api/v1/frost-profiles')).body.data.length, 1);
  } finally { await f.close(); }
});

test('frost API rejects invalid profiles and unknown ids', async () => {
  const f = await fixture();
  try {
    const invalid = await f.json('/api/v1/frost-profiles', 'POST', { name: 'Bad', zone: '5a', lastFrostDate: '2026-10-01', firstFrostDate: '2026-05-15' });
    assert.equal(invalid.status, 400);
    const missing = await f.json('/api/v1/frost-profiles/nope/windows/nope');
    assert.equal(missing.status, 404);
  } finally { await f.close(); }
});

test('frost API returns succession rounds for a custom sowing window', async () => {
  const f = await fixture();
  try {
    const profile = (await f.json('/api/v1/frost-profiles', 'POST', {
      name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01'
    })).body.data;
    const crop = (await f.json('/api/v1/crops', 'POST', {
      name: 'Cilantro', family: 'Apiaceae', daysToHarvest: 50, frostHardy: true,
      earliestSowWeeks: -2, latestSowWeeks: 2
    })).body.data;
    const plan = await f.json(`/api/v1/frost-profiles/${profile.id}/succession/${crop.id}?count=3&intervalDays=14`);
    assert.equal(plan.status, 200);
    assert.deepEqual(plan.body.data.rounds.map((round) => round.sowOn), ['2026-05-01', '2026-05-15', '2026-05-29']);
    const tooMany = await f.json(`/api/v1/frost-profiles/${profile.id}/succession/${crop.id}?count=5&intervalDays=14`);
    assert.equal(tooMany.status, 400);
  } finally { await f.close(); }
});
