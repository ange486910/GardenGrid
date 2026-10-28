import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

async function fixture() {
  const app = createApplication({ databasePath: ':memory:' }, { clock: { now: () => new Date('2026-10-28T08:00:00.000Z') } });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  return { json, close: () => new Promise((resolve) => server.close(() => { app.close(); resolve(); })) };
}

test('garden API plants crops and returns a calendar', async () => {
  const f = await fixture();
  try {
    const plot = (await f.json('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 })).body.data;
    const crop = (await f.json('/api/v1/crops', 'POST', { name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true })).body.data;
    const planting = await f.json('/api/v1/plantings', 'POST', { plotId: plot.id, cropId: crop.id, plantedOn: '2026-10-01' });
    assert.equal(planting.status, 201);
    assert.equal(planting.body.data.expectedHarvestOn, '2026-11-15');
    const calendar = await f.json('/api/v1/calendar?from=2026-10-01&to=2026-11-30');
    assert.equal(calendar.status, 200);
    assert.deepEqual(calendar.body.data.map((event) => event.type), ['plant', 'harvest']);
  } finally { await f.close(); }
});

test('garden API rejects rotation conflicts and invalid ranges', async () => {
  const f = await fixture();
  try {
    const plot = (await f.json('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 })).body.data;
    const tomato = (await f.json('/api/v1/crops', 'POST', { name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false })).body.data;
    const pepper = (await f.json('/api/v1/crops', 'POST', { name: 'Pepper', family: 'Solanaceae', daysToHarvest: 80, frostHardy: false })).body.data;
    assert.equal((await f.json('/api/v1/plantings', 'POST', { plotId: plot.id, cropId: tomato.id, plantedOn: '2024-05-01' })).status, 201);
    const conflict = await f.json('/api/v1/plantings', 'POST', { plotId: plot.id, cropId: pepper.id, plantedOn: '2026-05-01' });
    assert.equal(conflict.status, 409);
    assert.equal((await f.json('/api/v1/calendar?from=2026-12-01&to=2026-10-01')).status, 409);
    assert.equal((await f.json('/api/v1/calendar?from=bad&to=2026-10-01')).status, 400);
  } finally { await f.close(); }
});
