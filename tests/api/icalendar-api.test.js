import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';

async function withServer(run) {
  const app = createApplication({ databasePath: ':memory:' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run({ app, base });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
}

test('calendar API downloads a valid iCalendar feed', async () => {
  await withServer(async ({ app, base }) => {
    const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: '2026-05-01' });
    const response = await fetch(`${base}/api/v1/calendar.ics?from=2026-05-01&to=2026-06-30`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/calendar/);
    assert.match(response.headers.get('content-disposition'), /gardengrid-calendar\.ics/);
    const text = await response.text();
    assert.match(text, /BEGIN:VCALENDAR/);
    assert.match(text, /UID:plant-/);
  });
});

test('calendar API keeps plot filters and empty ranges explicit', async () => {
  await withServer(async ({ app, base }) => {
    const first = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
    const second = app.service.createPlot({ name: 'Bed B', areaSqm: 3 });
    const crop = app.service.createCrop({ name: 'Radish', family: 'Brassicaceae', daysToHarvest: 25, frostHardy: true });
    app.service.plant({ plotId: first.id, cropId: crop.id, plantedOn: '2026-04-02' });
    app.service.plant({ plotId: second.id, cropId: crop.id, plantedOn: '2026-04-03' });

    const filtered = await fetch(`${base}/api/v1/calendar.ics?from=2026-04-01&to=2026-05-31&plotId=${encodeURIComponent(second.id)}`);
    assert.equal(filtered.status, 200);
    const filteredText = await filtered.text();
    assert.equal(filteredText.includes('Bed B'), true);
    assert.equal(filteredText.includes('Bed A'), false);

    const empty = await fetch(`${base}/api/v1/calendar.ics?from=2027-01-01&to=2027-01-31`);
    assert.equal(empty.status, 200);
    const emptyText = await empty.text();
    assert.match(emptyText, /BEGIN:VCALENDAR/);
    assert.equal(emptyText.includes('BEGIN:VEVENT'), false);

    const invalid = await fetch(`${base}/api/v1/calendar.ics?from=2026-05-01&to=2026-04-01`);
    assert.equal(invalid.status, 409);
    assert.equal((await invalid.json()).error.code, 'conflict');
  });
});