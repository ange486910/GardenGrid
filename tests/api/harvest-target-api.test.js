import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('harvest target API records and reports seasonal variance', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  const planting = app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
  app.service.recordHarvest({ plantingId: planting.id, harvestedOn: '2026-07-10', quantity: 7, unit: 'kg' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const created = await fetch(`${base}/api/v1/harvest-targets`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plotId: plot.id, cropId: crop.id, season: 2026, unit: 'kg', targetQuantity: 10 })
    });
    assert.equal(created.status, 201);
    const report = await fetch(`${base}/api/v1/harvest-targets/report?season=2026`);
    assert.equal(report.status, 200);
    const payload = await report.json();
    assert.equal(payload.data.rows[0].varianceQuantity, -3);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
});
