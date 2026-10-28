import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export function listMigrations() {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort()
    .map((name) => ({ version: Number(name.split('_', 1)[0]), name, sql: readFileSync(join(migrationsDir, name), 'utf8') }));
}

export function migrateDatabase(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);`);
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((row) => Number(row.version)));
  const executed = [];
  for (const migration of listMigrations()) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(migration.version, migration.name, new Date().toISOString());
      db.exec('COMMIT;');
      executed.push(migration.version);
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  }
  return executed;
}
