import test from 'node:test';
import assert from 'node:assert/strict';
import { applySeasonResolutions, seasonImportPreviewToken, suggestSeasonResolutions, validateSeasonResolutions } from '../../src/domain/season-import-resolution.js';

const snapshot = {
  checksum: 'abc',
  plantings: [
    { id: 'p1', plotId: 'bed-a', cropId: 'tomato', plantedOn: '2026-05-01', expectedHarvestOn: '2026-07-10', status: 'active' },
    { id: 'p2', plotId: 'bed-a', cropId: 'lettuce', plantedOn: '2026-08-01', expectedHarvestOn: '2026-09-10', status: 'planned' }
  ]
};
const resolution = {
  format: 'gardengrid-season-resolutions', version: 1, snapshotChecksum: 'abc',
  resolutions: [
    { plantingId: 'p1', action: 'replace', plotId: 'bed-b', cropId: 'tomato', plantedOn: '2026-07-15', expectedHarvestOn: '2026-08-20' },
    { plantingId: 'p2', action: 'skip' }
  ]
};

test('season resolutions replace or skip reviewed planting rows', () => {
  assert.equal(validateSeasonResolutions(resolution, snapshot).resolutions.length, 2);
  const applied = applySeasonResolutions(snapshot, resolution);
  assert.deepEqual(applied.plantings, [{
    id: 'p1', plotId: 'bed-b', cropId: 'tomato', plantedOn: '2026-07-15', expectedHarvestOn: '2026-08-20', status: 'active'
  }]);
});

test('season resolutions reject stale snapshots duplicates and unknown rows', () => {
  assert.throws(() => validateSeasonResolutions({ ...resolution, snapshotChecksum: 'stale' }, snapshot), /snapshot checksum/);
  assert.throws(() => validateSeasonResolutions({ ...resolution, resolutions: [resolution.resolutions[1], resolution.resolutions[1]] }, snapshot), /unique/);
  assert.throws(() => validateSeasonResolutions({ ...resolution, resolutions: [{ plantingId: 'missing', action: 'skip' }] }, snapshot), /unknown planting/);
});

test('preview tokens change with snapshot, resolution and conflicts', () => {
  const first = seasonImportPreviewToken({ snapshot, resolutionFile: resolution, errors: [{ plantingId: 'p1' }] });
  const second = seasonImportPreviewToken({ snapshot, resolutionFile: resolution, errors: [{ plantingId: 'p1', reason: 'changed' }] });
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
});

test('conflict templates suggest one skip action per planting', () => {
  const template = suggestSeasonResolutions({
    snapshot,
    errors: [
      { plantingId: 'p1', reason: 'occupied' },
      { plantingId: 'p1', reason: 'duplicate conflict' },
      { plantingId: 'p2', reason: 'occupied' }
    ]
  });
  assert.equal(template.snapshotChecksum, snapshot.checksum);
  assert.deepEqual(template.resolutions, [
    { plantingId: 'p1', action: 'skip' },
    { plantingId: 'p2', action: 'skip' }
  ]);
});