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

test('garden API reports companion findings', async () => {
  const f = await fixture();
  try {
    const plot = (await f.json('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 })).body.data;
    const tomato = (await f.json('/api/v1/crops', 'POST', { name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false })).body.data;
    const basil = (await f.json('/api/v1/crops', 'POST', { name: 'Basil', family: 'Lamiaceae', daysToHarvest: 60, frostHardy: false })).body.data;
    await f.json('/api/v1/plantings', 'POST', { plotId: plot.id, cropId: tomato.id, plantedOn: '2026-05-20' });
    await f.json('/api/v1/plantings', 'POST', { plotId: plot.id, cropId: basil.id, plantedOn: '2026-05-20' });
    const response = await f.json('/api/v1/companions');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.findings.length, 1);
    assert.equal(response.body.data.findings[0].type, 'companion');
    assert.equal(response.body.data.findings[0].ruleId, 'tomato-basil');
  } finally { await f.close(); }
});
