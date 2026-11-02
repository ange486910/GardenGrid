import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('companion rule API creates and deletes a custom pair', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const created = await json('/api/v1/companion-rules', 'POST', { pair: ['tomato', 'basil'], type: 'companion', note: 'Grow together' });
    assert.equal(created.status, 201);
    assert.equal((await json('/api/v1/companion-rules')).body.data.length, 1);
    assert.equal((await json(`/api/v1/companion-rules/${created.body.data.id}`, 'DELETE')).status, 200);
  } finally { await new Promise((resolve) => server.close(() => { app.close(); resolve(); })); }
});
