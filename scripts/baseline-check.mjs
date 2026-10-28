import { existsSync } from 'node:fs';
const major = Number(process.versions.node.split('.')[0]);
if (major < 24) { console.error(`Node 24+ required, found ${process.version}`); process.exit(1); }
const { DatabaseSync } = await import('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE probe (id INTEGER PRIMARY KEY, value TEXT)');
db.prepare('INSERT INTO probe (value) VALUES (?)').run('ok');
const row = db.prepare('SELECT value FROM probe WHERE id = 1').get();
db.close();
if (row.value !== 'ok') { console.error('sqlite probe failed'); process.exit(1); }
const payload = { status: 'ok', node: process.versions.node, sqlite: 'ok', offline: existsSync('package.json') };
console.log(JSON.stringify(payload));
