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
    return { status: response.status, headers: response.headers, text: await response.text() };
  };
  return { app, request, close: () => new Promise((resolve) => server.close(() => { app.close(); resolve(); })) };
}

function sourceSnapshot() {
  const source = createApplication({ databasePath: ':memory:' });
  try {
    const plot = source.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const crop = source.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const planting = source.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    source.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 2, unit: 'kg' });
    return source.service.exportSeason('json').body;
  } finally { source.close(); }
}

test('season import API previews, imports and rejects corrupted packages', async () => {
  const f = await fixture();
  try {
    await f.request('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 });
    await f.request('/api/v1/crops', 'POST', {
      name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false
    });
    const snapshot = sourceSnapshot();

    const preview = await f.request('/api/v1/imports/season', 'POST', { snapshot, dryRun: true });
    assert.equal(preview.status, 200);
    assert.equal(JSON.parse(preview.text).data.ready, 1);
    assert.equal(f.app.service.listPlantings().length, 0);

    const imported = await f.request('/api/v1/imports/season', 'POST', { snapshot });
    assert.equal(imported.status, 200);
    assert.equal(JSON.parse(imported.text).data.imported.plantings, 1);
    assert.equal(f.app.service.listHarvests().length, 1);

    const corrupted = structuredClone(snapshot);
    corrupted.plantings[0].status = 'harvested';
    const rejected = await f.request('/api/v1/imports/season', 'POST', { snapshot: corrupted });
    assert.equal(rejected.status, 400);
  } finally { await f.close(); }
});
