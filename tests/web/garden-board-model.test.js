import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGardenBoard } from '../../src/web/public/board-model.js';

test('garden board groups plantings by plot and marks companion warnings', () => {
  const board = buildGardenBoard({
    plots: [{ id: 'bed_a', name: 'Bed A' }, { id: 'bed_b', name: 'Bed B' }],
    crops: [
      { id: 'tomato', name: 'Tomato', family: 'Solanaceae' },
      { id: 'basil', name: 'Basil', family: 'Lamiaceae' }
    ],
    plantings: [
      { id: 'p1', plotId: 'bed_a', cropId: 'tomato', plantedOn: '2026-05-01', expectedHarvestOn: '2026-07-10', status: 'active' },
      { id: 'p2', plotId: 'bed_a', cropId: 'basil', plantedOn: '2026-05-03', expectedHarvestOn: '2026-07-01', status: 'planned' }
    ],
    yields: { rows: [{ plotId: 'bed_a', totalQuantity: 2.5, unit: 'kg' }] },
    companions: { findings: [{ plantingIds: ['p1', 'p2'] }] },
    today: '2026-05-10'
  });
  assert.equal(board.cards[0].plantings.length, 2);
  assert.equal(board.cards[0].warningCount, 2);
  assert.equal(board.cards[0].yieldLabel, '2.5 kg');
  assert.equal(board.cards[0].plantings.find((row) => row.id === 'p1').daysToHarvest, 61);
  assert.equal(board.totalWarnings, 1);
});
