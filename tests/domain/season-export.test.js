import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonExport, seasonCsvCell, seasonPlantingsCsv } from '../../src/domain/season-export.js';

const source = {
  plots: [{ id: 'bed_a', name: 'Bed, A' }],
  crops: [{ id: 'tomato', name: 'Tomato', family: 'Solanaceae' }],
  plantings: [{
    id: 'p1', plotId: 'bed_a', cropId: 'tomato', plantedOn: '2026-05-01',
    expectedHarvestOn: '2026-07-10', status: 'active'
  }],
  harvests: [{ id: 'h1', plantingId: 'p1', harvestedOn: '2026-07-10', quantity: 2.5, unit: 'kg' }],
  rotationEvents: [],
  generatedAt: '2026-10-31T08:00:00.000Z'
};

test('season export enriches planting and harvest relations', () => {
  const built = buildSeasonExport(source);
  assert.equal(built.data.plantings[0].plotName, 'Bed, A');
  assert.equal(built.data.plantings[0].cropName, 'Tomato');
  assert.equal(built.data.harvests[0].cropId, 'tomato');
  assert.equal(built.manifest.counts.plantings, 1);
  assert.equal(built.checksum.length, 64);
});

test('season CSV escapes delimiters and contains planting fields', () => {
  const built = buildSeasonExport(source);
  const csv = seasonPlantingsCsv(built.data.plantings);
  assert.match(csv, /"Bed, A"/);
  assert.match(csv, /Tomato,Solanaceae,2026-05-01,2026-07-10,active/);
  assert.equal(seasonCsvCell('plain'), 'plain');
  assert.equal(seasonCsvCell('a"b'), '"a""b"');
});
