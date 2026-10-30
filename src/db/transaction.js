export function runInTransaction(db, work) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = work();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch { /* preserve the original failure */ }
    throw error;
  }
}
