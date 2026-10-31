import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonExport } from '../../src/domain/season-export.js';
import { validateSeasonImport } from '../../src/domain/season-import.js';

function exportedPackage() {
  const built = buildSeasonExport({
    plots: [{ id: 'bed_a', name: 'Bed A', areaSqm: 6, sunExposure: 'full', createdAt: '2026-10-01T08:00:00.000Z' }],
    crops: [{ id: 'tomato', name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false, earliestSowWeeks: null, latestSowWeeks: null, createdAt: '2026-10-01T08:00:00.000Z' }],
    plantings: [{
      id: 'p1', plotId: 'bed_a', cropId: 'tomato', plantedOn: '2026-05-01',
      expectedHarvestOn: '2026-07-10', status: 'active', createdAt: '2026-05-01T08:00:00.000Z'
    }],
    harvests: [],
    rotationEvents: [],
    generatedAt: '2026-10-31T08:00:00.000Z'
  });
  return { ...built.manifest, checksum: built.checksum, ...built.data };
}

test('season import validates references and package checksum', () => {
  const parsed = validateSeasonImport(exportedPackage());
  assert.equal(parsed.plantings[0].plotId, 'bed_a');
  assert.equal(parsed.checksum.length, 64);
});

test('season import rejects tampered payloads and dangling references', () => {
  const tampered = exportedPackage();
  tampered.plantings[0].status = 'harvested';
  assert.throws(() => validateSeasonImport(tampered), /checksum/);

  const dangling = exportedPackage();
  dangling.plantings[0].plotId = 'missing';
  assert.throws(() => validateSeasonImport(dangling), /unknown plot/);
});
