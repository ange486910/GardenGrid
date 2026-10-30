import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../../src/application/create-application.js';

function fixture() {
  let counter = 0;
  return createApplication({ databasePath: ':memory:' }, { clock: { now: () => new Date('2026-10-29T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` });
}

test('garden service computes sowing windows for hardy and tender crops', () => {
  const app = fixture();
  try {
    const profile = app.service.createFrostProfile({ name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' });
    const hardy = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    const tender = app.service.createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false });
    assert.deepEqual(app.service.window(hardy.id, profile.id), { cropId: hardy.id, profileId: profile.id, earliest: '2026-04-17', latest: '2026-05-01', relativeToFrost: 'before' });
    assert.deepEqual(app.service.window(tender.id, profile.id), { cropId: tender.id, profileId: profile.id, earliest: '2026-05-22', latest: '2026-06-05', relativeToFrost: 'after' });
    assert.equal(app.service.listFrostProfiles().length, 1);
  } finally { app.close(); }
});

test('garden service rejects unknown crops and profiles', () => {
  const app = fixture();
  try {
    const profile = app.service.createFrostProfile({ name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' });
    const crop = app.service.createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true });
    assert.throws(() => app.service.window('missing', profile.id), (error) => error.name === 'NotFoundError');
    assert.throws(() => app.service.window(crop.id, 'missing'), (error) => error.name === 'NotFoundError');
    assert.throws(() => app.service.createFrostProfile({ name: 'Bad', zone: '5a', lastFrostDate: '2026-10-01', firstFrostDate: '2026-05-15' }), (error) => error.name === 'ValidationError');
  } finally { app.close(); }
});

test('garden service uses custom offsets for windows and succession planning', () => {
  const app = fixture();
  try {
    const profile = app.service.createFrostProfile({
      name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01'
    });
    const crop = app.service.createCrop({
      name: 'Cilantro', family: 'Apiaceae', daysToHarvest: 50, frostHardy: true,
      earliestSowWeeks: -2, latestSowWeeks: 2
    });
    assert.equal(app.service.window(crop.id, profile.id).earliest, '2026-05-01');
    const plan = app.service.successionPlan(crop.id, profile.id, 3, 14);
    assert.deepEqual(plan.rounds.map((round) => round.sowOn), ['2026-05-01', '2026-05-15', '2026-05-29']);
    assert.throws(() => app.service.successionPlan(crop.id, profile.id, 5, 14), (error) => error.name === 'ValidationError');
  } finally { app.close(); }
});
