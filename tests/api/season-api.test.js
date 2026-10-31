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
  return { request, close: () => new Promise((resolve) => server.close(() => { app.close(); resolve(); })) };
}

test('season API filters yields and downloads JSON or CSV plans', async () => {
  const f = await fixture();
  try {
    const plot = JSON.parse((await f.request('/api/v1/plots', 'POST', { name: 'Bed A', areaSqm: 6 })).text).data;
    const crop = JSON.parse((await f.request('/api/v1/crops', 'POST', {
      name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false
    })).text).data;
    const planting = JSON.parse((await f.request('/api/v1/plantings', 'POST', {
      plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01'
    })).text).data;
    await f.request('/api/v1/harvests', 'POST', {
      plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 2.5, unit: 'kg'
    });

    const yieldReport = await f.request(`/api/v1/yield?plotId=${plot.id}`);
    assert.equal(yieldReport.status, 200);
    assert.equal(JSON.parse(yieldReport.text).data.rows[0].totalQuantity, 2.5);

    const jsonExport = await f.request('/api/v1/exports/season?format=json');
    assert.equal(jsonExport.status, 200);
    assert.equal(JSON.parse(jsonExport.text).counts.plantings, 1);
    assert.match(jsonExport.headers.get('content-type'), /application\/json/);

    const csvExport = await f.request('/api/v1/exports/season?format=csv');
    assert.equal(csvExport.status, 200);
    assert.match(csvExport.headers.get('content-disposition'), /gardengrid-season\.csv/);
    assert.match(csvExport.text, /Tomato/);

    assert.equal((await f.request('/api/v1/exports/season?format=xml')).status, 400);
  } finally { await f.close(); }
});
