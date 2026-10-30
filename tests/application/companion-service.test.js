import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, { clock: { now: () => new Date('2026-10-30T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` });
}

test('companion report finds antagonist and companion pairs in one plot', () => {
  const app = fixture();
  try {
    const bedA = app.service.createPlot({ name: 'Bed A', areaSqm: 6 });
    const bedB = app.service.createPlot({ name: 'Bed B', areaSqm: 4 });
    const tomato = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    const basil = app.service.createCrop({ name: 'Basil', family: 'Lamiaceae', daysToHarvest: 60, frostHardy: false });
    const beans = app.service.createCrop({ name: 'Beans', family: 'Fabaceae', daysToHarvest: 60, frostHardy: false });
    const onion = app.service.createCrop({ name: 'Onion', family: 'Amaryllidaceae', daysToHarvest: 100, frostHardy: true });
    const lettuce = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.service.plant({ plotId: bedA.id, cropId: tomato.id, plantedOn: '2026-05-20' });
    app.service.plant({ plotId: bedA.id, cropId: basil.id, plantedOn: '2026-05-20' });
    app.service.plant({ plotId: bedA.id, cropId: beans.id, plantedOn: '2026-05-20' });
    app.service.plant({ plotId: bedA.id, cropId: onion.id, plantedOn: '2026-05-20' });
    app.service.plant({ plotId: bedB.id, cropId: lettuce.id, plantedOn: '2026-05-20' });
    const report = app.service.companionReport();
    assert.deepEqual(report.findings.map((finding) => finding.ruleId), ['beans-onion', 'tomato-basil']);
    assert.equal(report.findings[0].plotName, 'Bed A');
    assert.equal(report.findings[0].type, 'antagonist');
  } finally { app.close(); }
});
