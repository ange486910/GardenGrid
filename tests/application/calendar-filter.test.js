import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

test('calendar filters events by plot and rejects unknown plots', () => {
  const app = createApplication({ databasePath: ':memory:' });
  try {
    const a = app.service.createPlot({ name: 'Bed A', areaSqm: 4 });
    const b = app.service.createPlot({ name: 'Bed B', areaSqm: 4 });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    app.service.plant({ plotId: a.id, cropId: crop.id, plantedOn: '2026-05-01' });
    app.service.plant({ plotId: b.id, cropId: crop.id, plantedOn: '2026-05-02' });
    const events = app.service.calendar('2026-05-01', '2026-06-30', a.id);
    assert.equal(events.length, 2);
    assert.equal(events.every((event) => event.plot === 'Bed A'), true);
    assert.throws(() => app.service.calendar('2026-05-01', '2026-06-30', 'missing'), (error) => error.name === 'NotFoundError');
  } finally { app.close(); }
});
