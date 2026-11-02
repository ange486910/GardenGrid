import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('plot order API persists a complete bed ordering', async () => {
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
    const a = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
    const b = app.service.createPlot({ name: 'Bed B', areaSqm: 4 });
    const c = app.service.createPlot({ name: 'Bed C', areaSqm: 4 });
    const reordered = await request('/api/v1/plots/order', 'PATCH', { plotIds: [c.id, a.id, b.id] });
    assert.equal(reordered.status, 200);
    assert.deepEqual(reordered.body.data.map((row) => row.id), [c.id, a.id, b.id]);
    assert.deepEqual(reordered.body.data.map((row) => row.displayOrder), [1, 2, 3]);
    const invalid = await request('/api/v1/plots/order', 'PATCH', { plotIds: [a.id, a.id, b.id] });
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
});
