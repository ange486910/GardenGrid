import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from '../../src/db/connection.js';
import { migrateDatabase } from '../../src/db/migrate.js';
import { GardenRepository } from '../../src/db/repositories/garden-repository.js';
import { createFrostProfile } from '../../src/domain/garden.js';

test('frost profiles round-trip through the repository', () => {
  const root = join(process.cwd(), 'work', 'gardengrid-tests');
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, 'frost-'));
  const db = openDatabase(join(directory, 'test.sqlite'));
  try {
    migrateDatabase(db);
    const repository = new GardenRepository(db);
    let counter = 0;
    const deps = { clock: { now: () => new Date('2026-10-29T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` };
    const profile = repository.createFrostProfile(createFrostProfile({ name: 'Zone 5', zone: '5a', lastFrostDate: '2026-05-15', firstFrostDate: '2026-10-01' }, deps));
    assert.equal(repository.listFrostProfiles()[0].id, profile.id);
    assert.equal(repository.findFrostProfile(profile.id).zone, '5a');
    assert.equal(repository.findFrostProfile(profile.id).lastFrostDate, '2026-05-15');
    assert.equal(repository.findFrostProfile('missing'), null);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
