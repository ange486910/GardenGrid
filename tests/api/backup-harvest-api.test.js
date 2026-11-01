import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

async function fixture() {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, text: await response.text() };
  };
  return { request, close: () => new Promise((resolve) => server.close(() => { app.close(); resolve(); })) };
}

test('harvest and backup API exposes corrections, revisions and restore', async () => {
  const source = createApplication({ databasePath: ':memory:' });
  const plot = source.service.createPlot({ name: 'Bed', areaSqm: 4 });
  const crop = source.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
  const planting = source.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
  const harvest = source.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-06-15', quantity: 1, unit: 'kg' });
  const backup = source.service.exportBackup();
  source.close();

  const f = await fixture();
  try {
    const restored = await f.request('/api/v1/restore', 'POST', { backup });
    assert.equal(restored.status, 200);
    const patched = await f.request(`/api/v1/harvests/${harvest.id}`, 'PATCH', { quantity: 2.5 });
    assert.equal(patched.status, 200);
    assert.equal(JSON.parse(patched.text).data.quantity, 2.5);
    assert.equal(JSON.parse((await f.request('/api/v1/harvest-revisions')).text).data[0].action, 'updated');
    assert.equal((await f.request(`/api/v1/harvests/${harvest.id}`, 'DELETE')).status, 200);
  } finally { await f.close(); }
});
