import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';
import { launchGardenBrowser } from './cdp.js';

test('garden browser surfaces rotation errors and records harvest yield', { timeout: 30000 }, async (t) => {
  const app = createApplication({ databasePath: ':memory:' });
  const plot = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
  const tomato = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
  const pepper = app.service.createCrop({ name: 'Pepper', family: 'Solanaceae', daysToHarvest: 80, frostHardy: false });
  app.service.plant({ plotId: plot.id, cropId: tomato.id, plantedOn: '2025-05-01' });
  const server = await startServer(app.service);
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    try {
      browser = await launchGardenBrowser(`${base}/`);
    } catch (error) {
      t.skip(`Edge browser unavailable: ${error.message}`);
      return;
    }
    await browser.waitFor("document.querySelectorAll('[data-role=\"plot-cards\"] article').length === 1");
    await browser.evaluate(`(() => {
      const form = document.querySelector('[data-role="plant-form"]');
      form.querySelector('[name="plotId"]').value = ${JSON.stringify(plot.id)};
      form.querySelector('[name="cropId"]').value = ${JSON.stringify(pepper.id)};
      form.querySelector('[name="plantedOn"]').value = '2026-05-01';
      form.requestSubmit();
      return true;
    })()`);
    await browser.waitFor("document.querySelector('[data-role=\"status\"]').textContent.includes('rotation conflict')");
    assert.equal(await browser.evaluate("document.querySelector('[data-role=\"plant-form\"] button').disabled"), false);
    assert.equal(app.service.listPlantings().length, 1);

    await browser.waitFor("document.querySelectorAll('[data-role=\"harvest-form\"] select[name=\"plantingId\"] option').length === 1");
    await browser.evaluate(`(() => {
      const form = document.querySelector('[data-role="harvest-form"]');
      form.querySelector('[name="quantity"]').value = '2.5';
      form.querySelector('[name="harvestedOn"]').value = '2026-07-10';
      form.querySelector('[name="unit"]').value = 'kg';
      form.requestSubmit();
      return true;
    })()`);
    await browser.waitFor("document.querySelector('[data-role=\"status\"]').textContent.includes('Garden updated')");
    assert.equal(app.service.listHarvests().length, 1);
    assert.equal(app.service.yieldByPlot(plot.id).rows[0].totalQuantity, 2.5);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(() => { app.close(); resolve(); }));
  }
});
