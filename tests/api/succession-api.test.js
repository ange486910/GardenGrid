import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('succession API creates selected rounds and reports overlap conflicts', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 8 });
    const crop = app.service.createCrop({
      name: 'Radish', family: 'Brassicaceae', daysToHarvest: 10, frostHardy: true,
      earliestSowWeeks: -2, latestSowWeeks: 4
    });
    const profile = app.service.createFrostProfile({
      name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01'
    });
    const created = await request('/api/v1/plantings/succession', 'POST', {
      plotId: plot.id, cropId: crop.id, profileId: profile.id,
      count: 3, intervalDays: 14, selectedRounds: [2]
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.plantings.length, 1);
    assert.equal(created.body.data.plantings[0].plantedOn, '2026-05-15');
    const batches = await request('/api/v1/succession-batches');
    assert.equal(batches.status, 200);
    assert.deepEqual(batches.body.data[0].selectedRounds, [2]);

    const overlap = await request('/api/v1/plantings/succession', 'POST', {
      plotId: plot.id, cropId: crop.id, profileId: profile.id,
      count: 3, intervalDays: 14, selectedRounds: [2]
    });
    assert.equal(overlap.status, 409);
    assert.match(overlap.body.error.message, /overlaps/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
});
