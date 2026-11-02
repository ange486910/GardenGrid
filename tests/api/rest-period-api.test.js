import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('rest period API creates filters and rejects overlapping bed commitments', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const created = await request('/api/v1/rest-periods', 'POST', {
      plotId: plot.id, kind: 'fallow', startedOn: '2026-06-01', endedOn: '2026-07-01', note: 'summer rest'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.kind, 'fallow');
    const listed = await request(`/api/v1/rest-periods?plotId=${plot.id}`);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.length, 1);
    const overlap = await request('/api/v1/rest-periods', 'POST', {
      plotId: plot.id, kind: 'fallow', startedOn: '2026-06-15', endedOn: '2026-07-15'
    });
    assert.equal(overlap.status, 409);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
});
