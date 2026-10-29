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

test('garden API records harvests and returns yield totals', async () => {
  const f = await fixture();
  try {
    const plot = (await f.json('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 })).body.data;
    const crop = (await f.json('/api/v1/crops', 'POST', { name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false })).body.data;
    const planting = (await f.json('/api/v1/plantings', 'POST', { plotId: plot.id, cropId: crop.id, plantedOn: '2026-08-01' })).body.data;
    const harvest = await f.json('/api/v1/harvests', 'POST', { plantingId: planting.id, harvestedOn: '2026-10-20', quantity: 2.5, unit: 'kg' });
    assert.equal(harvest.status, 201);
    const yieldReport = await f.json('/api/v1/yield');
    assert.equal(yieldReport.status, 200);
    assert.equal(yieldReport.body.data.totalHarvests, 1);
    assert.equal(yieldReport.body.data.byCrop[0].totalQuantity, 2.5);
    assert.equal((await f.json('/api/v1/harvests')).body.data.length, 1);
  } finally { await f.close(); }
});

test('garden API rejects harvests without a planting', async () => {
  const f = await fixture();
  try {
    const missing = await f.json('/api/v1/harvests', 'POST', { plantingId: 'missing', harvestedOn: '2026-10-20', quantity: 1, unit: 'kg' });
    assert.equal(missing.status, 404);
    const invalid = await f.json('/api/v1/harvests', 'POST', { plantingId: 'x', harvestedOn: '2026-10-20', quantity: 1, unit: 'bucket' });
    assert.equal(invalid.status, 400);
  } finally { await f.close(); }
});
