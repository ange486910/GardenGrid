import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

test('work queue API reports due harvest work for a bed', async () => {
  const app = createApplication({ databasePath: ':memory:' });
  const bed = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
  const other = app.service.createPlot({ name: 'Bed B', areaSqm: 3 });
  const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 30, frostHardy: true });
  app.service.plant({ plotId: bed.id, cropId: crop.id, plantedOn: '2026-05-01', status: 'active' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/v1/work-queue?asOf=2026-05-25&horizonDays=10`);
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.total, 1);
    assert.equal(data.harvest, 1);
    assert.equal(data.tasks[0].title, 'Harvest Lettuce');
    assert.equal(data.tasks[0].dueOn, '2026-05-31');

    const filtered = await fetch(`${base}/api/v1/work-queue?asOf=2026-05-25&plotId=${encodeURIComponent(other.id)}`);
    assert.equal((await filtered.json()).data.total, 0);

    const invalid = await fetch(`${base}/api/v1/work-queue?asOf=2026-05-25&horizonDays=0`);
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
});