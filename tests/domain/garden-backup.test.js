import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGardenBackup, validateGardenBackup } from '../../src/domain/backup.js';

function data() {
  return {
    plots: [{ id: 'bed' }], crops: [{ id: 'tomato' }], frostProfiles: [],
    plantings: [{ id: 'p1', plotId: 'bed', cropId: 'tomato' }],
    harvests: [{ id: 'h1', plantingId: 'p1' }], rotationEvents: [], restPeriods: [], harvestTargets: []
  };
}

test('garden backup verifies checksum and references', () => {
  const backup = buildGardenBackup({ data: data(), generatedAt: '2026-11-01T08:00:00.000Z' });
  assert.equal(validateGardenBackup(backup).counts.harvests, 1);
  const changed = structuredClone(backup);
  changed.data.harvests[0].quantity = 2;
  assert.throws(() => validateGardenBackup(changed), /checksum/);
});

test('garden backup rejects dangling planting references', () => {
  const invalid = data();
  invalid.plantings[0].plotId = 'missing';
  const backup = buildGardenBackup({ data: invalid, generatedAt: '2026-11-01T08:00:00.000Z' });
  assert.throws(() => validateGardenBackup(backup), /unknown plot/);
});

test('garden backup rejects rest periods with dangling references', () => {
  const invalid = data();
  invalid.restPeriods.push({ id: 'r1', plotId: 'bed', cropId: 'missing', kind: 'cover_crop' });
  const backup = buildGardenBackup({ data: invalid, generatedAt: '2026-11-01T08:00:00.000Z' });
  assert.throws(() => validateGardenBackup(backup), /unknown crop/);
});

test('garden backup rejects harvest targets with dangling references', () => {
  const invalid = data();
  invalid.harvestTargets.push({ id: 'target1', plotId: 'bed', cropId: 'missing' });
  const backup = buildGardenBackup({ data: invalid, generatedAt: '2026-11-01T08:00:00.000Z' });
  assert.throws(() => validateGardenBackup(backup), /unknown plot or crop/);
});