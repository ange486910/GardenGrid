import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';
import { launchGardenBrowser } from './cdp.js';

test('garden reorders beds with its keyboard command', { timeout: 30000 }, async (t) => {
  const app = createApplication({ databasePath: ':memory:' });
  const a = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
  app.service.createPlot({ name: 'Bed B', areaSqm: 4 });
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
    await browser.waitFor("document.querySelectorAll('[data-role=\"plot-cards\"] article').length === 2");
    await browser.evaluate(`(() => {
      const card = document.querySelector('[data-plot-id="${a.id}"]');
      card.focus();
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
      return true;
    })()`);
    await browser.waitFor(`document.querySelector('[data-role="plot-cards"] article:first-child')?.dataset.plotId === '${a.id}'`);
    assert.equal(app.service.listPlots()[0].id, a.id);
    assert.equal(app.service.listPlots()[0].displayOrder, 2);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(() => { app.close(); resolve(); }));
  }
});
