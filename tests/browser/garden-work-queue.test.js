import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';
import { launchGardenBrowser } from './cdp.js';

test('garden workspace renders upcoming harvest work', { timeout: 30000 }, async (t) => {
  const app = createApplication({ databasePath: ':memory:' });
  const today = new Date().toISOString().slice(0, 10);
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
  const crop = app.service.createCrop({ name: 'Radish', family: 'Brassicaceae', daysToHarvest: 7, frostHardy: true });
  app.service.plant({ plotId: plot.id, cropId: crop.id, plantedOn: today, status: 'active' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    try {
      browser = await launchGardenBrowser(`${base}/`);
    } catch (error) {
      t.skip(`Chromium browser unavailable: ${error.message}`);
      return;
    }
    await browser.waitFor("document.querySelectorAll('[data-role=\"work-queue\"] li').length === 1");
    assert.match(await browser.evaluate("document.querySelector('[data-role=\"work-queue\"]').textContent"), /Harvest Radish/);
    assert.equal(await browser.evaluate("document.querySelector('[data-summary=\"tasks\"]').textContent"), '1');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    app.close();
  }
});