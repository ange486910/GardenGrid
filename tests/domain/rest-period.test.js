import test from 'node:test';
import assert from 'node:assert/strict';
import { createRestPeriod, findRestConflict, summarizeRestPeriods, validateRestPeriodInput } from '../../src/domain/rest-period.js';

const base = {
  plotId: 'bed-a', kind: 'fallow', startedOn: '2026-06-01', endedOn: '2026-07-15', note: 'summer rest'
};

test('rest period validation distinguishes fallow and cover crop records', () => {
  assert.equal(validateRestPeriodInput(base).kind, 'fallow');
  assert.equal(validateRestPeriodInput({ ...base, kind: 'cover_crop', cropId: 'clover' }).cropId, 'clover');
  assert.throws(() => validateRestPeriodInput({ ...base, cropId: 'clover' }), /fallow/);
  assert.throws(() => validateRestPeriodInput({ ...base, kind: 'cover_crop' }), /cropId/);
  assert.throws(() => validateRestPeriodInput({ ...base, endedOn: '2026-05-01' }), /endedOn/);
});

test('rest conflict detection covers other rests and planted ranges', () => {
  const candidate = validateRestPeriodInput(base);
  assert.deepEqual(findRestConflict({
    candidate,
    restPeriods: [{ id: 'rest-2', ...base, startedOn: '2026-07-01', endedOn: '2026-08-01' }],
    plantings: []
  }), { type: 'rest_period', id: 'rest-2' });
  assert.deepEqual(findRestConflict({
    candidate,
    restPeriods: [],
    plantings: [{ id: 'p1', plotId: 'bed-a', plantedOn: '2026-07-10', expectedHarvestOn: '2026-08-01' }]
  }), { type: 'planting', id: 'p1' });
  assert.equal(findRestConflict({ candidate, restPeriods: [], plantings: [] }), null);
});

test('rest period creation and seasonal summaries clip to the requested interval', () => {
  const period = createRestPeriod(base, {
    clock: { now: () => new Date('2026-05-01T08:00:00.000Z') },
    createId: () => 'rest-1'
  });
  assert.equal(period.id, 'rest-1');
  const summary = summarizeRestPeriods({ periods: [period], plotId: 'bed-a', from: '2026-06-15', to: '2026-06-30' });
  assert.equal(summary.periods[0].days, 16);
  assert.equal(summary.totalDays, 16);
});
