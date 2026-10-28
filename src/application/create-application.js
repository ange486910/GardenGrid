import { openDatabase } from '../db/connection.js';
import { migrateDatabase } from '../db/migrate.js';
import { GardenRepository } from '../db/repositories/garden-repository.js';
import { createGardenService } from './garden-service.js';

export function createApplication(config = {}, dependencies = {}) {
  const db = openDatabase(config.databasePath ?? ':memory:');
  migrateDatabase(db);
  const repository = new GardenRepository(db);
  const service = createGardenService(repository, dependencies);
  return { db, repository, service, close() { db.close(); } };
}
