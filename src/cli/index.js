#!/usr/bin/env node
import { createApplication } from '../application/create-application.js';
import { startServer } from '../api/server.js';

function parse(argv) {
  const command = argv[2] ?? 'help';
  const options = { databasePath: 'data/gardengrid.sqlite' };
  for (let index = 3; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--database') options.databasePath = argv[++index];
    else if (token === '--from') options.from = argv[++index];
    else if (token === '--to') options.to = argv[++index];
    else if (token === '--port') options.port = Number(argv[++index]);
  }
  return { command, options };
}

const help = `GardenGrid CLI

  node src/cli/index.js migrate [--database <path>]
  node src/cli/index.js calendar --from YYYY-MM-DD --to YYYY-MM-DD [--database <path>]
  node src/cli/index.js serve [--port <port>] [--database <path>]
`;

const { command, options } = parse(process.argv);

if (command === 'migrate') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    const tables = app.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all().map((row) => row.name);
    console.log(JSON.stringify({ status: 'ok', database: options.databasePath, tables }, null, 2));
  } finally { app.close(); }
} else if (command === 'calendar') {
  const app = createApplication({ databasePath: options.databasePath });
  try {
    console.log(JSON.stringify({ status: 'ok', events: app.service.calendar(options.from, options.to) }, null, 2));
  } finally { app.close(); }
} else if (command === 'serve') {
  const app = createApplication({ databasePath: options.databasePath });
  const server = await startServer(app.service, { port: options.port ?? 4312 });
  console.log(JSON.stringify({ status: 'ok', url: `http://127.0.0.1:${server.address().port}` }));
} else {
  console.log(help);
}
