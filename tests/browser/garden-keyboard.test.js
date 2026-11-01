import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';
import { startServer } from '../../src/api/server.js';
import { launchGardenBrowser } from './cdp.js';

test('garden beds are navigable with arrow keys', { timeout: 30000 }, async (t) => {
  const app = createApplication({ databasePath: ':memory:' });
  app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
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
    await browser.evaluate("document.querySelectorAll('[data-role=\"plot-cards\"] article')[0].focus()");
    await browser.evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
    assert.equal(await browser.evaluate("document.activeElement === document.querySelectorAll('[data-role=\"plot-cards\"] article')[1]"), true);
    assert.match(await browser.evaluate("document.querySelector('[data-role=\"status\"]').textContent"), /Bed 2 of 2/);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(() => { app.close(); resolve(); }));
  }
});
