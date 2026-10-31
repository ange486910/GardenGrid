import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSeasonImport } from '../../src/domain/season-import.js';

const plots = [{ id: 'bed_a', name: 'Bed A' }];
const crops = [{ id: 'tomato', name: 'Tomato' }, { id: 'lettuce', name: 'Lettuce' }];
const snapshot = {
  plots: [{ id: 'source_bed', name: 'Bed A' }],
  crops: [{ id: 'source_tomato', name: 'Tomato' }, { id: 'source_lettuce', name: 'Lettuce' }],
  plantings: [
    { id: 'p_existing', plotId: 'source_bed', cropId: 'source_tomato', plantedOn: '2026-05-01', expectedHarvestOn: '2026-07-10', status: 'active' },
    { id: 'p_overlap', plotId: 'source_bed', cropId: 'source_lettuce', plantedOn: '2026-06-01', expectedHarvestOn: '2026-07-15', status: 'planned' },
    { id: 'p_ready', plotId: 'source_bed', cropId: 'source_lettuce', plantedOn: '2026-08-01', expectedHarvestOn: '2026-09-15', status: 'planned' }
  ]
};

test('season import planner skips exact rows and rejects occupied date ranges', () => {
  const analysis = analyzeSeasonImport({
    snapshot,
    plots,
    crops,
    plantings: [{ id: 'existing', plotId: 'bed_a', cropId: 'tomato', plantedOn: '2026-05-01', expectedHarvestOn: '2026-07-10' }]
  });
  assert.deepEqual(analysis.ready.map((row) => row.id), ['p_ready']);
  assert.deepEqual(analysis.skipped.map((row) => row.plantingId), ['p_existing']);
  assert.deepEqual(analysis.errors.map((row) => row.plantingId), ['p_overlap']);
});

test('season import planner reports missing plots and crops', () => {
  const analysis = analyzeSeasonImport({
    snapshot: {
      plots: [],
      crops: [],
      plantings: [{ id: 'p1', plotId: 'missing_plot', cropId: 'missing_crop', plantedOn: '2026-05-01', expectedHarvestOn: '2026-06-01' }]
    },
    plots,
    crops,
    plantings: []
  });
  assert.equal(analysis.ready.length, 0);
  assert.match(analysis.errors[0].reason, /plot not found/);
});
