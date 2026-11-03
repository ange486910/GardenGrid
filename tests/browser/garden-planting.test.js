import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';
import { launchGardenBrowser } from './cdp.js';

test('garden browser plants a crop and refreshes the bed', { timeout: 30000 }, async (t) => {
  const app = createApplication({ databasePath: ':memory:' });
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const crop = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
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
    await browser.waitFor("document.querySelectorAll('[data-role=\"plot-cards\"] article').length === 1");
    await browser.evaluate(`(() => {
      const form = document.querySelector('[data-role="plant-form"]');
      form.querySelector('[name="plotId"]').value = ${JSON.stringify(plot.id)};
      form.querySelector('[name="cropId"]').value = ${JSON.stringify(crop.id)};
      form.querySelector('[name="plantedOn"]').value = '2026-05-01';
      form.requestSubmit();
      return true;
    })()`);
    await browser.waitFor("document.querySelector('[data-role=\"plot-cards\"]').textContent.includes('Tomato')");
    await browser.waitFor("document.querySelector('[data-role=\"status\"]').textContent.includes('Garden updated')");
    assert.equal(app.service.listPlantings().length, 1);
    assert.equal(app.service.listRotationEvents().length, 1);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(() => { app.close(); resolve(); }));
  }
});
