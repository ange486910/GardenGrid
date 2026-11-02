import test from 'node:test';
import assert from 'node:assert/strict';
import { findPlotOverlap, successionPlantingDrafts } from '../../src/domain/succession-planting.js';

const plan = {
  count: 3,
  rounds: [
    { sowOn: '2026-05-01', expectedHarvestOn: '2026-06-20' },
    { sowOn: '2026-05-15', expectedHarvestOn: '2026-07-04' },
    { sowOn: '2026-07-01', expectedHarvestOn: '2026-08-20' }
  ]
};

test('succession drafts use one-based round selection and stable order', () => {
  const drafts = successionPlantingDrafts({ plan, plotId: 'bed-a', cropId: 'lettuce', selectedRounds: [3, 1] });
  assert.deepEqual(drafts.map((draft) => [draft.round, draft.plantedOn]), [[1, '2026-05-01'], [3, '2026-07-01']]);
  assert.equal(drafts[0].status, 'planned');
});

test('succession drafts reject overlapping selected rounds and duplicates', () => {
  assert.throws(
    () => successionPlantingDrafts({ plan, plotId: 'bed-a', cropId: 'lettuce', selectedRounds: [1, 2] }),
    (error) => error.name === 'ValidationError' && error.details.field === 'selectedRounds'
  );
  assert.throws(
    () => successionPlantingDrafts({ plan, plotId: 'bed-a', cropId: 'lettuce', selectedRounds: [1, 1] }),
    /duplicates/
  );
});

test('findPlotOverlap reports an existing planting in the same bed', () => {
  const drafts = successionPlantingDrafts({ plan, plotId: 'bed-a', cropId: 'lettuce', selectedRounds: [3] });
  const overlap = findPlotOverlap(drafts, [{ id: 'old', plotId: 'bed-a', plantedOn: '2026-07-10', expectedHarvestOn: '2026-08-01' }]);
  assert.equal(overlap.conflict.id, 'old');
  assert.equal(overlap.draft.round, 3);
});
