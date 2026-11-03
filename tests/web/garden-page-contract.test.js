import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('garden page exposes a semantic bed board and planting form', () => {
  const html = readFileSync(join(process.cwd(), 'src', 'web', 'public', 'index.html'), 'utf8');
  assert.match(html, /<html lang="en">/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /data-role="plot-cards"/);
  assert.match(html, /data-role="target-form"/);
  assert.match(html, /data-role="target-report"/);
  assert.match(html, /data-role="plant-form"/);
  assert.match(html, /data-role="calendar-export"/);
  assert.match(html, /data-role="work-queue"/);
  assert.match(html, /data-summary="tasks"/);
  assert.match(html, /<label>Bed<select name="plotId"/);
  assert.match(html, /<label>Crop<select name="cropId"/);
  assert.match(html, /data-role="status"[^>]*aria-live="polite"/);
  assert.match(html, /type="module" src="\/app\.js"/);
});

test('garden server serves the board with an ETag and supports 304 responses', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const first = await fetch(`${base}/`);
    assert.equal(first.status, 200);
    assert.match(await first.text(), /GardenGrid bed board/);
    const etag = first.headers.get('etag');
    assert.ok(etag);
    const cached = await fetch(`${base}/`, { headers: { 'if-none-match': etag } });
    assert.equal(cached.status, 304);
    const css = await fetch(`${base}/garden.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
  } finally {
    await new Promise((resolve) => server.close(() => { app.close(); resolve(); }));
  }
});
