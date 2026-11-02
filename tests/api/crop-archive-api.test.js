import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('crop archive API toggles crop availability', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const archived = await fetch(`${base}/api/v1/crops/${crop.id}/archive`, { method: 'POST' });
    assert.equal((await archived.json()).data.archivedAt.length > 0, true);
    const restored = await fetch(`${base}/api/v1/crops/${crop.id}/restore`, { method: 'POST' });
    assert.equal((await restored.json()).data.archivedAt, null);
  } finally { await new Promise((resolve) => server.close(() => { app.close(); resolve(); })); }
});
