import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

async function fixture() {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  return { json, close: () => new Promise((resolve) => server.close(() => { app.close(); resolve(); })) };
}

test('rotation API imports history and reports blocked families', async () => {
  const f = await fixture();
  try {
    const plot = (await f.json('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 })).body.data;
    const tomato = (await f.json('/api/v1/crops', 'POST', {
      name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false
    })).body.data;
    const lettuce = (await f.json('/api/v1/crops', 'POST', {
      name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true
    })).body.data;
    const event = await f.json('/api/v1/rotation-events', 'POST', {
      plotId: plot.id,
      cropId: tomato.id,
      plantedOn: '2024-05-01',
      endedOn: '2024-08-01'
    });

    assert.equal(event.status, 201);
    assert.equal(event.body.data.family, 'Solanaceae');
    assert.equal((await f.json('/api/v1/rotation-events')).body.data.length, 1);
    const report = await f.json('/api/v1/rotation-report?asOf=2026-10-30');
    assert.deepEqual(report.body.data.plots[0].blockedFamilies, ['Solanaceae']);
    assert.deepEqual(report.body.data.plots[0].availableFamilies, ['Asteraceae']);
    const duplicate = await f.json('/api/v1/rotation-events', 'POST', {
      plotId: plot.id,
      cropId: tomato.id,
      plantedOn: '2024-05-01',
      endedOn: '2024-08-01'
    });
    assert.equal(duplicate.status, 409);

    const plant = await f.json('/api/v1/plantings', 'POST', {
      plotId: plot.id,
      cropId: lettuce.id,
      plantedOn: '2026-05-01'
    });
    assert.equal(plant.status, 201);
  } finally { await f.close(); }
});
